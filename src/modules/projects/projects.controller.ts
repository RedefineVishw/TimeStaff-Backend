import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';
import { UpdateProjectMemberDto } from './dto/update-project-member.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
    constructor(private readonly projectsService: ProjectsService) { }

    @Post()
    @UseGuards(RolesGuard)
    @Roles('ORGANIZATION_ADMIN')
    @SuccessMessage('Project created.')
    create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateProjectDto) {
        return this.projectsService.create(user, dto);
    }

    @Get()
    @SuccessMessage('Projects retrieved.')
    findAll(@CurrentUser() user: CurrentUserPayload) {
        return this.projectsService.findAll(user);
    }

    @Get(':id')
    @SuccessMessage('Project retrieved.')
    findOne(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.projectsService.findOne(user, id);
    }

    @Patch(':id')
    @SuccessMessage('Project updated.')
    update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateProjectDto) {
        return this.projectsService.update(user, id, dto);
    }

    @Get(':id/members')
    @SuccessMessage('Project members retrieved.')
    listMembers(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.projectsService.listMembers(user, id);
    }

    @Post(':id/members')
    @SuccessMessage('Member added to project.')
    addMember(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Body() dto: AddProjectMemberDto,
    ) {
        return this.projectsService.addMember(user, id, dto);
    }

    @Patch(':id/members/:userId')
    @SuccessMessage('Member role updated.')
    updateMemberRole(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body() dto: UpdateProjectMemberDto,
    ) {
        return this.projectsService.updateMemberRole(user, id, userId, dto);
    }

    @Delete(':id/members/:userId')
    @SuccessMessage('Member removed from project.')
    removeMember(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Param('userId') userId: string,
    ) {
        return this.projectsService.removeMember(user, id, userId);
    }
}
