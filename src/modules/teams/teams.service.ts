import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { AddTeamMemberDto } from './dto/add-team-member.dto.js';
import { SetTeamLeadDto } from './dto/set-team-lead.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

// Team creation/membership is managed by whoever can manage the project's
// membership at all — the same permission ProjectsService.addMember uses.
const MANAGE_PERMISSION = 'project.members.manage';

@Injectable()
export class TeamsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
    ) { }

    async findAllForProject(user: CurrentUserPayload, projectId: string) {
        await this.access.assertAccess(user, projectId);
        return this.prisma.team.findMany({
            where: { projectId },
            include: {
                members: {
                    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
                },
            },
            orderBy: { createdAt: 'asc' },
        });
    }

    async create(user: CurrentUserPayload, projectId: string, dto: CreateTeamDto) {
        await this.access.assertPermission(user, projectId, MANAGE_PERMISSION);
        return this.prisma.team.create({
            data: { projectId, name: dto.name, createdBy: user.id, updatedBy: user.id },
        });
    }

    async remove(user: CurrentUserPayload, teamId: string) {
        const team = await this.getTeamOrThrow(teamId);
        await this.access.assertPermission(user, team.projectId, MANAGE_PERMISSION);
        await this.prisma.teamMember.deleteMany({ where: { teamId } });
        await this.prisma.team.delete({ where: { id: teamId } });
        return { id: teamId };
    }

    async addMember(user: CurrentUserPayload, teamId: string, dto: AddTeamMemberDto) {
        const team = await this.getTeamOrThrow(teamId);
        await this.access.assertPermission(user, team.projectId, MANAGE_PERMISSION);

        // Only real project members can be put on a team — the org admin
        // doesn't need to be (and can't be, they already have full access).
        const projectMembership = await this.access.getMembership(dto.userId, team.projectId);
        if (!projectMembership) {
            throw new BadRequestException('userId must already be a member of this project');
        }

        const existing = await this.prisma.teamMember.findUnique({
            where: { teamId_userId: { teamId, userId: dto.userId } },
        });
        if (existing) {
            throw new ConflictException('This user is already on the team');
        }

        return this.prisma.teamMember.create({
            data: { teamId, userId: dto.userId, isLead: dto.isLead ?? false, addedBy: user.id },
        });
    }

    async setLead(user: CurrentUserPayload, teamId: string, userId: string, dto: SetTeamLeadDto) {
        const team = await this.getTeamOrThrow(teamId);
        await this.access.assertPermission(user, team.projectId, MANAGE_PERMISSION);

        const existing = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
        if (!existing) {
            throw new NotFoundException('This user is not on the team');
        }

        return this.prisma.teamMember.update({
            where: { teamId_userId: { teamId, userId } },
            data: { isLead: dto.isLead },
        });
    }

    async removeMember(user: CurrentUserPayload, teamId: string, userId: string) {
        const team = await this.getTeamOrThrow(teamId);
        await this.access.assertPermission(user, team.projectId, MANAGE_PERMISSION);

        const existing = await this.prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } });
        if (!existing) {
            throw new NotFoundException('This user is not on the team');
        }

        await this.prisma.teamMember.delete({ where: { teamId_userId: { teamId, userId } } });
        return { id: userId };
    }

    private async getTeamOrThrow(id: string) {
        const team = await this.prisma.team.findUnique({ where: { id } });
        if (!team) {
            throw new NotFoundException('Team not found');
        }
        return team;
    }
}
