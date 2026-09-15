import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from './project-access.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

const ORG_ADMIN_ROLE_NAME = 'ORGANIZATION_ADMIN';

@Injectable()
export class ProjectsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
    ) { }

    // Only ORGANIZATION_ADMIN creates projects — enforced at the controller
    // via @Roles, not here, but the org-scoping still happens here.
    create(user: CurrentUserPayload, dto: CreateProjectDto) {
        return this.prisma.project.create({
            data: {
                organizationId: user.organizationId!,
                name: dto.name,
                description: dto.description,
                createdBy: user.id,
                updatedBy: user.id,
            },
        });
    }

    // Admin sees every project in the org; anyone else only sees projects
    // they're an explicit member of.
    findAll(user: CurrentUserPayload) {
        if (user.role?.name === ORG_ADMIN_ROLE_NAME) {
            return this.prisma.project.findMany({ where: { organizationId: user.organizationId! } });
        }
        return this.prisma.project.findMany({
            where: { organizationId: user.organizationId!, members: { some: { userId: user.id } } },
        });
    }

    async findOne(user: CurrentUserPayload, id: string) {
        const project = await this.access.assertAccess(user, id);
        const members = await this.prisma.projectMember.findMany({
            where: { projectId: id },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                role: { select: { id: true, name: true } },
            },
        });
        return { ...project, members };
    }

    async update(user: CurrentUserPayload, id: string, dto: UpdateProjectDto) {
        await this.access.assertPermission(user, id, 'project.edit');
        return this.prisma.project.update({
            where: { id },
            data: { name: dto.name, description: dto.description, updatedBy: user.id },
        });
    }

    async listMembers(user: CurrentUserPayload, projectId: string) {
        await this.access.assertAccess(user, projectId);
        return this.prisma.projectMember.findMany({
            where: { projectId },
            include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
                role: { select: { id: true, name: true } },
            },
        });
    }

    async addMember(user: CurrentUserPayload, projectId: string, dto: AddProjectMemberDto) {
        await this.access.assertPermission(user, projectId, 'project.members.manage');

        const target = await this.prisma.user.findUnique({ where: { id: dto.userId } });
        if (!target || target.organizationId !== user.organizationId) {
            throw new BadRequestException('userId does not belong to your organization');
        }

        const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
        if (!role) {
            throw new BadRequestException('roleId does not match any known role');
        }

        const existing = await this.access.getMembership(dto.userId, projectId);
        if (existing) {
            throw new ConflictException('This user is already a member of the project — use PATCH to change their role');
        }

        return this.prisma.projectMember.create({
            data: { projectId, userId: dto.userId, roleId: dto.roleId, addedBy: user.id },
        });
    }

    async updateMemberRole(user: CurrentUserPayload, projectId: string, userId: string, dto: UpdateProjectMemberDto) {
        await this.access.assertPermission(user, projectId, 'project.members.manage');

        const existing = await this.access.getMembership(userId, projectId);
        if (!existing) {
            throw new NotFoundException('This user is not a member of the project');
        }

        return this.prisma.projectMember.update({
            where: { projectId_userId: { projectId, userId } },
            data: { roleId: dto.roleId },
        });
    }

    async removeMember(user: CurrentUserPayload, projectId: string, userId: string) {
        await this.access.assertPermission(user, projectId, 'project.members.manage');

        const existing = await this.access.getMembership(userId, projectId);
        if (!existing) {
            throw new NotFoundException('This user is not a member of the project');
        }

        await this.prisma.projectMember.delete({ where: { projectId_userId: { projectId, userId } } });
        return { id: userId };
    }
}
