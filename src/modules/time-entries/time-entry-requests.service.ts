import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateTimeEntryRequestDto } from './dto/create-time-entry-request.dto.js';
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
    // can ask. An org admin's own submission needs no one's sign-off: it's
    // created straight through as APPROVED, with the real TimeEntry already
    // attached, so it still shows up in "my requests" for a consistent
    // history instead of being invisible/special-cased there.
    async create(user: CurrentUserPayload, taskId: string, dto: CreateTimeEntryRequestDto) {
        const task = await this.getLeafTaskOrThrow(taskId);
        await this.access.assertPermission(user, task.projectId, 'time.create');

        const startedAt = new Date(dto.startedAt);
        const endedAt = new Date(dto.endedAt);
        if (endedAt <= startedAt) {
            throw new BadRequestException('endedAt must be after startedAt');
        }

        if (user.role?.name === ORG_ADMIN_ROLE_NAME) {
            const timeEntry = await this.prisma.timeEntry.create({
                data: {
                    taskId,
                    userId: user.id,
                    startedAt,
                    endedAt,
                    durationSec: this.durationSec(startedAt, endedAt),
                    note: dto.note,
                },
            });
            return this.prisma.timeEntryRequest.create({
                data: {
                    taskId,
                    userId: user.id,
                    startedAt,
                    endedAt,
                    note: dto.note,
                    status: 'APPROVED',
                    reviewedBy: user.id,
                    reviewedAt: new Date(),
                    timeEntryId: timeEntry.id,
                },
            });
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
            // An admin's own requests are auto-approved and never reach
            // SUBMITTED, but guard anyway rather than assume that always holds.
            return submitted.filter((r) => r.userId !== user.id);
        }

        const eligible = [];
        for (const request of submitted) {
            if (request.userId === user.id) continue;
            if (await this.canApprove(user, request.task.projectId, request.userId)) {
                eligible.push(request);
            }
        }
        return eligible;
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
        if (request.userId === user.id) {
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
    // admin always is. Everyone else needs an actual ProjectMember row on
    // both sides — no membership on either side means no comparison is
    // possible, so it fails closed (not approvable).
    private async canApprove(approver: CurrentUserPayload, projectId: string, submitterId: string): Promise<boolean> {
        if (approver.role?.name === ORG_ADMIN_ROLE_NAME) {
            return true;
        }

        const approverMembership = await this.access.getMembership(approver.id, projectId);
        if (!approverMembership) return false;
        const approverRank = ROLE_RANK[approverMembership.role.name] ?? 0;

        const submitterMembership = await this.access.getMembership(submitterId, projectId);
        const submitterRank = submitterMembership ? (ROLE_RANK[submitterMembership.role.name] ?? 1) : 1;

        return approverRank > submitterRank;
    }

    // Every user this project's submitter's request should notify: org
    // admins (org-wide, no ProjectMember row needed) plus any project
    // member ranked above the submitter.
    private async getEligibleApproverIds(projectId: string, submitter: CurrentUserPayload): Promise<string[]> {
        const submitterMembership = await this.access.getMembership(submitter.id, projectId);
        const submitterRank = submitterMembership ? (ROLE_RANK[submitterMembership.role.name] ?? 1) : 1;

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

        return [...new Set([...admins.map((a) => a.id), ...higherRankedMemberIds])];
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
