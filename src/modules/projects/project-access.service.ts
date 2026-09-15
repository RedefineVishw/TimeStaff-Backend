import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

const ORG_ADMIN_ROLE_NAME = 'ORGANIZATION_ADMIN';
const PROJECT_MANAGER_ROLE_NAME = 'PROJECT_MANAGER';
const TEAM_LEAD_ROLE_NAME = 'TEAM_LEAD';

export type TaskVisibilityScope =
    | { kind: 'ALL' } // org admin / project manager — see everything in the project
    | { kind: 'TEAM'; userIds: Set<string> } // team lead — self + everyone in a team they lead
    | { kind: 'OWN' }; // everyone else — only tasks assigned to (or created by) themselves

// Shared by ProjectsService, TasksService, and TimeEntriesService — a
// user's role is scoped per-project (ProjectMember.roleId), never global,
// except ORGANIZATION_ADMIN, which always has full access to every project
// in their org regardless of ProjectMember rows (a hard rule, not a default).
@Injectable()
export class ProjectAccessService {
    constructor(private readonly prisma: PrismaService) { }

    getMembership(userId: string, projectId: string) {
        return this.prisma.projectMember.findUnique({
            where: { projectId_userId: { projectId, userId } },
            include: { role: { include: { permissions: { include: { permission: true } } } } },
        });
    }

    // Loads the project and throws if it doesn't exist / isn't in the
    // caller's org / the caller has no business seeing it at all. Returns
    // the project so callers don't need a second fetch.
    async assertAccess(user: CurrentUserPayload, projectId: string) {
        const project = await this.prisma.project.findUnique({ where: { id: projectId } });
        if (!project || project.organizationId !== user.organizationId) {
            // Same response whether it doesn't exist or belongs to another
            // org — don't leak which project IDs are real.
            throw new NotFoundException('Project not found');
        }

        if (user.role?.name === ORG_ADMIN_ROLE_NAME) {
            return project;
        }

        const membership = await this.getMembership(user.id, projectId);
        if (!membership) {
            throw new ForbiddenException('You do not have access to this project');
        }

        return project;
    }

    // Same as assertAccess, plus requires a specific permission on the
    // caller's project-scoped role — skipped entirely for ORGANIZATION_ADMIN.
    async assertPermission(user: CurrentUserPayload, projectId: string, permission: string) {
        const project = await this.assertAccess(user, projectId);

        if (user.role?.name === ORG_ADMIN_ROLE_NAME) {
            return project;
        }

        const membership = await this.getMembership(user.id, projectId);
        const permissionNames = membership!.role.permissions.map((rp) => rp.permission.name);
        if (!permissionNames.includes(permission)) {
            throw new ForbiddenException('You do not have permission to perform this action');
        }

        return project;
    }

    // What task visibility/assignment scope this user has within this
    // project: full (admin/PM), their led teams' members (team lead), or
    // just themselves (everyone else — employees don't see each other's
    // tasks).
    async getTaskVisibilityScope(user: CurrentUserPayload, projectId: string): Promise<TaskVisibilityScope> {
        if (user.role?.name === ORG_ADMIN_ROLE_NAME) {
            return { kind: 'ALL' };
        }

        const membership = await this.getMembership(user.id, projectId);
        const roleName = membership?.role.name;

        if (roleName === PROJECT_MANAGER_ROLE_NAME) {
            return { kind: 'ALL' };
        }

        if (roleName === TEAM_LEAD_ROLE_NAME) {
            const userIds = await this.getLedTeamMemberIds(user.id, projectId);
            return { kind: 'TEAM', userIds };
        }

        return { kind: 'OWN' };
    }

    // Every user id in any team this user leads within this project,
    // including the lead themselves.
    async getLedTeamMemberIds(userId: string, projectId: string): Promise<Set<string>> {
        const ledTeams = await this.prisma.team.findMany({
            where: { projectId, members: { some: { userId, isLead: true } } },
            include: { members: { select: { userId: true } } },
        });

        const ids = new Set<string>([userId]);
        for (const team of ledTeams) {
            for (const member of team.members) {
                ids.add(member.userId);
            }
        }
        return ids;
    }

    // Can `assignerUser` assign a task to `targetUserId` in this project?
    // Admin/PM: anyone with project access. Team lead: only themselves or
    // members of a team they lead. Everyone else shouldn't reach this check
    // at all (they lack task.assign), but fail closed regardless.
    async canAssign(assignerUser: CurrentUserPayload, projectId: string, targetUserId: string): Promise<boolean> {
        if (assignerUser.role?.name === ORG_ADMIN_ROLE_NAME) {
            return true;
        }

        const membership = await this.getMembership(assignerUser.id, projectId);
        const roleName = membership?.role.name;

        if (roleName === PROJECT_MANAGER_ROLE_NAME) {
            return true;
        }

        if (roleName === TEAM_LEAD_ROLE_NAME) {
            const ledMemberIds = await this.getLedTeamMemberIds(assignerUser.id, projectId);
            return ledMemberIds.has(targetUserId);
        }

        return false;
    }
}
