import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateTimeEntryRequestDto } from './dto/create-time-entry-request.dto.js';
import { UpdateTimeEntryRequestDto } from './dto/update-time-entry-request.dto.js';
import { DenyTimeEntryRequestDto } from './dto/deny-time-entry-request.dto.js';
import { FindTimeEntryRequestsDto } from './dto/find-time-entry-requests.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

const ORG_ADMIN_ROLE_NAME = 'ORGANIZATION_ADMIN';

// Where each role sits in the approval ladder — not stored anywhere in the
// schema (Role has no rank column), so this is the one place that decides
// "who is above whom". Employee/QA/Coordinator/HR all sit at the bottom
// rung together: none of them can approve each other's time, only someone
// project-scoped above them can. Team Lead sits above that rung; Project
// Manager above Team Lead; Org Admin is unconditionally on top (and isn't
// even a ProjectMember row most of the time — handled separately below).
const ROLE_RANK: Record<string, number> = {
    EMPLOYEE: 1,
    QA: 1,
    COORDINATOR: 1,
    HR: 1,
    TEAM_LEAD: 2,
    PROJECT_MANAGER: 3,
    ORGANIZATION_ADMIN: 4,
};

@Injectable()
export class TimeEntryRequestsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly notifications: NotificationsService,
    ) { }

    // Submitting is the same eligibility as manually logging time at all
    // (time.create) — the hierarchy only decides who *approves* it, not who
    // can ask. The org admin is NOT an exception here: their own submission
    // still goes through SUBMITTED like anyone else's, and they review and
    // approve it themselves (see assertCanReview's admin carve-out below) —
    // there's simply no one *above* them to ask, so they're the one who
    // has to act on it, not someone who skips the step entirely.
    async create(user: CurrentUserPayload, taskId: string, dto: CreateTimeEntryRequestDto) {
        const task = await this.getLeafTaskOrThrow(taskId);
        await this.access.assertPermission(user, task.projectId, 'time.create');

        const startedAt = new Date(dto.startedAt);
        const endedAt = new Date(dto.endedAt);
        if (endedAt <= startedAt) {
            throw new BadRequestException('endedAt must be after startedAt');
        }

        const request = await this.prisma.timeEntryRequest.create({
            data: { taskId, userId: user.id, startedAt, endedAt, note: dto.note },
        });

        const approverIds = await this.getEligibleApproverIds(task.projectId, user);
        for (const approverId of approverIds) {
            await this.notifications.create({
                userId: approverId,
                type: 'TIME_REQUEST_SUBMITTED',
                title: `${user.email} submitted a manual time request for: ${task.title}`,
                entityType: 'TimeEntryRequest',
                entityId: request.id,
            });
        }

        return request;
    }

    // Only the submitter, and only while it's still SUBMITTED — once
    // someone's reviewed it (or you've cancelled it yourself), the record
    // needs to stay as-is for an honest history rather than being editable
    // out from under whoever acted on it.
    async update(user: CurrentUserPayload, id: string, dto: UpdateTimeEntryRequestDto) {
        const request = await this.getRequestOrThrow(id);
        if (request.userId !== user.id) {
            throw new ForbiddenException('You can only edit your own requests');
        }
        if (request.status !== 'SUBMITTED') {
            throw new BadRequestException('This request has already been reviewed and can no longer be edited');
        }

        const startedAt = dto.startedAt ? new Date(dto.startedAt) : request.startedAt;
        const endedAt = dto.endedAt ? new Date(dto.endedAt) : request.endedAt;
        if (endedAt <= startedAt) {
            throw new BadRequestException('endedAt must be after startedAt');
        }

        return this.prisma.timeEntryRequest.update({
            where: { id },
            data: { startedAt, endedAt, note: dto.note ?? request.note },
            include: { task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } } },
        });
    }

    // Withdrawing your own request — distinct from an approver denying it
    // (see deny() below). Same "only while SUBMITTED" rule as update().
    async cancel(user: CurrentUserPayload, id: string) {
        const request = await this.getRequestOrThrow(id);
        if (request.userId !== user.id) {
            throw new ForbiddenException('You can only cancel your own requests');
        }
        if (request.status !== 'SUBMITTED') {
            throw new BadRequestException('This request has already been reviewed and can no longer be cancelled');
        }

        return this.prisma.timeEntryRequest.update({
            where: { id },
            data: { status: 'CANCELLED' },
            include: { task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } } },
        });
    }

    // The submitter's own history — every request they've ever made,
    // regardless of who (if anyone) had to review it. This is the personal
    // "Manual Time Requests" list — never anyone else's requests.
    findMine(user: CurrentUserPayload, query: FindTimeEntryRequestsDto) {
        return this.prisma.timeEntryRequest.findMany({
            where: { userId: user.id, ...(query.status ? { status: query.status } : {}) },
            include: { task: { select: { id: true, title: true, project: { select: { id: true, name: true } } } } },
            orderBy: { createdAt: 'desc' },
            take: 200,
        });
    }

    // Everything currently sitting in this user's approval queue — across
    // every project where they outrank the submitter, or every project at
    // all if they're the org admin. Small-scale N+1 (one membership lookup
    // per pending request) is fine here: this is a review queue, not a hot
    // path, and the alternative (a single denormalized query) would need a
    // rank column on the DB side that doesn't exist yet.
    async findPendingForApprover(user: CurrentUserPayload) {
        const isOrgAdmin = user.role?.name === ORG_ADMIN_ROLE_NAME;
        const submitted = await this.prisma.timeEntryRequest.findMany({
            where: {
                status: 'SUBMITTED',
                task: { project: { organizationId: user.organizationId ?? undefined } },
            },
            include: {
                task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true } } } },
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'asc' },
        });

        if (isOrgAdmin) {
            // Includes the admin's own pending requests — no exception for
            // them, they review and approve those themselves (see
            // assertCanReview).
            return submitted;
        }

        const eligible = [];
        for (const request of submitted) {
            // Non-admins never approve their own — only the org admin gets
            // that carve-out, handled by the branch above.
            if (request.userId === user.id) continue;
            if (await this.canApprove(user, request.task.projectId, request.userId)) {
                eligible.push(request);
            }
        }
        return eligible;
    }

    // Whether this user has approval authority *anywhere* in the org — the
    // org admin, or ranked Team Lead/PM on at least one project. Purely for
    // gating the Approvals page/nav item client-side so a regular employee
    // never sees an approve/deny UI at all (even one that would just show
    // "nothing to review" for them) — the real approve()/deny() endpoints
    // above independently re-check eligibility per request regardless.
    async canApproveAnything(user: CurrentUserPayload): Promise<boolean> {
        if (user.role?.name === ORG_ADMIN_ROLE_NAME) {
            return true;
        }
        const memberships = await this.prisma.projectMember.findMany({
            where: { userId: user.id },
            include: { role: true },
        });
        return memberships.some((m) => (ROLE_RANK[m.role.name] ?? 0) >= ROLE_RANK.TEAM_LEAD);
    }

    // Everything within this approver's scope — every status, not just
    // SUBMITTED — so the Approval Requests dashboard can show real totals
    // (pending/approved/denied across everyone they outrank, or everyone in
    // the org if they're the admin) alongside how many of those *they*
    // personally reviewed. Optionally narrowed to one submitter for the
    // "select a particular person" filter. Same N+1-per-request membership
    // check as findPendingForApprover — fine at this scale, see that method's
    // note.
    async findAllInScope(user: CurrentUserPayload, submitterId?: string) {
        const isOrgAdmin = user.role?.name === ORG_ADMIN_ROLE_NAME;
        const all = await this.prisma.timeEntryRequest.findMany({
            where: {
                task: { project: { organizationId: user.organizationId ?? undefined } },
                ...(submitterId ? { userId: submitterId } : {}),
            },
            include: {
                task: { select: { id: true, title: true, projectId: true, project: { select: { id: true, name: true } } } },
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        if (isOrgAdmin) {
            // Includes the admin's own requests — same reasoning as
            // findPendingForApprover above.
            return all;
        }

        const inScope = [];
        for (const request of all) {
            if (request.userId === user.id) continue;
            if (await this.canApprove(user, request.task.projectId, request.userId)) {
                inScope.push(request);
            }
        }
        return inScope;
    }

    async approve(user: CurrentUserPayload, id: string) {
        const request = await this.getRequestOrThrow(id);
        await this.assertCanReview(user, request);

        const timeEntry = await this.prisma.timeEntry.create({
            data: {
                taskId: request.taskId,
                userId: request.userId,
                startedAt: request.startedAt,
                endedAt: request.endedAt,
                durationSec: this.durationSec(request.startedAt, request.endedAt),
                note: request.note,
            },
        });

        const updated = await this.prisma.timeEntryRequest.update({
            where: { id },
            data: { status: 'APPROVED', reviewedBy: user.id, reviewedAt: new Date(), timeEntryId: timeEntry.id },
        });

        await this.notifications.create({
            userId: request.userId,
            type: 'TIME_REQUEST_APPROVED',
            title: 'Your manual time request was approved',
            entityType: 'TimeEntryRequest',
            entityId: request.id,
        });

        return updated;
    }

    async deny(user: CurrentUserPayload, id: string, dto: DenyTimeEntryRequestDto) {
        const request = await this.getRequestOrThrow(id);
        await this.assertCanReview(user, request);

        const updated = await this.prisma.timeEntryRequest.update({
            where: { id },
            data: { status: 'DENIED', reviewedBy: user.id, reviewedAt: new Date(), reviewNote: dto.reviewNote },
        });

        await this.notifications.create({
            userId: request.userId,
            type: 'TIME_REQUEST_DENIED',
            title: 'Your manual time request was denied',
            message: dto.reviewNote,
            entityType: 'TimeEntryRequest',
            entityId: request.id,
        });

        return updated;
    }

    private async assertCanReview(user: CurrentUserPayload, request: { id: string; userId: string; taskId: string; status: string }) {
        if (request.status !== 'SUBMITTED') {
            throw new BadRequestException('This request has already been reviewed');
        }
        // Nobody approves their own request — except the org admin, who has
        // no exception here: there's no one above them, so approving their
        // own submission is the only way it ever gets approved at all.
        if (request.userId === user.id && user.role?.name !== ORG_ADMIN_ROLE_NAME) {
            throw new ForbiddenException("You can't approve your own request");
        }
        const task = await this.prisma.task.findUnique({ where: { id: request.taskId } });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        const allowed = await this.canApprove(user, task.projectId, request.userId);
        if (!allowed) {
            throw new ForbiddenException('You do not have permission to review this request');
        }
    }

    // Is `approver` ranked above `submitterId` within this project? Org
    // admin always is (unconditionally — including reviewing another
    // admin's or their own request: rank 4 has nothing above it, so
    // "above the submitter" isn't a meaningful bar for them to clear).
    // Everyone else needs an actual ProjectMember row on their own side —
    // no membership means no comparison is possible, fails closed.
    private async canApprove(approver: CurrentUserPayload, projectId: string, submitterId: string): Promise<boolean> {
        if (approver.role?.name === ORG_ADMIN_ROLE_NAME) {
            return true;
        }

        const approverMembership = await this.access.getMembership(approver.id, projectId);
        if (!approverMembership) return false;
        const approverRank = ROLE_RANK[approverMembership.role.name] ?? 0;

        const submitterRank = await this.getSubmitterRank(projectId, submitterId);
        return approverRank > submitterRank;
    }

    // The submitter's rank for hierarchy comparisons — checks their
    // org-wide role first (an ORGANIZATION_ADMIN is rank 4 regardless of
    // whether they even have a ProjectMember row, which they often don't),
    // falling back to their project-scoped ProjectMember role, and finally
    // to the bottom rung if they have neither. Without the org-admin check
    // first, an admin submitting a request with no ProjectMember row would
    // fall through to "no membership = rank 1", wrongly letting a Team Lead
    // or PM "outrank" and approve an admin's own request.
    private async getSubmitterRank(projectId: string, submitterId: string): Promise<number> {
        const submitterUser = await this.prisma.user.findUnique({
            where: { id: submitterId },
            include: { role: true },
        });
        if (submitterUser?.role?.name === ORG_ADMIN_ROLE_NAME) {
            return ROLE_RANK.ORGANIZATION_ADMIN;
        }

        const membership = await this.access.getMembership(submitterId, projectId);
        return membership ? (ROLE_RANK[membership.role.name] ?? 1) : 1;
    }

    // Every user this project's submitter's request should notify: org
    // admins (org-wide, no ProjectMember row needed) plus any project
    // member ranked above the submitter. Never the submitter themselves,
    // even if they're an admin — that self-notification would be noise,
    // not a missing approver (they'll see it in their own pending queue).
    private async getEligibleApproverIds(projectId: string, submitter: CurrentUserPayload): Promise<string[]> {
        const submitterRank = await this.getSubmitterRank(projectId, submitter.id);

        const [admins, members] = await Promise.all([
            this.prisma.user.findMany({
                where: { organizationId: submitter.organizationId ?? undefined, role: { name: ORG_ADMIN_ROLE_NAME } },
                select: { id: true },
            }),
            this.prisma.projectMember.findMany({
                where: { projectId },
                include: { role: true },
            }),
        ]);

        const higherRankedMemberIds = members
            .filter((m) => m.userId !== submitter.id && (ROLE_RANK[m.role.name] ?? 0) > submitterRank)
            .map((m) => m.userId);
        const adminIds = admins.map((a) => a.id).filter((id) => id !== submitter.id);

        return [...new Set([...adminIds, ...higherRankedMemberIds])];
    }

    private durationSec(startedAt: Date, endedAt: Date): number {
        return Math.round((endedAt.getTime() - startedAt.getTime()) / 1000);
    }

    private async getRequestOrThrow(id: string) {
        const request = await this.prisma.timeEntryRequest.findUnique({ where: { id } });
        if (!request) {
            throw new NotFoundException('Time entry request not found');
        }
        return request;
    }

    private async getLeafTaskOrThrow(taskId: string) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { _count: { select: { subtasks: true } } },
        });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        if (task._count.subtasks > 0) {
            throw new BadRequestException('Time can only be tracked on a task with no subtasks');
        }
        return task;
    }
}
