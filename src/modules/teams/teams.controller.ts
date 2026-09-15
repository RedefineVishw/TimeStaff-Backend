import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service.js';
import { CreateTeamDto } from './dto/create-team.dto.js';
import { AddTeamMemberDto } from './dto/add-team-member.dto.js';
import { SetTeamLeadDto } from './dto/set-team-lead.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

// Same "no single base path" shape as TasksController — /projects/:id/teams
// to create/list, /teams/:id for everything else.
@Controller()
@UseGuards(JwtAuthGuard)
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Get('projects/:id/teams')
    @SuccessMessage('Teams retrieved.')
    findAllForProject(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string) {
        return this.teamsService.findAllForProject(user, projectId);
    }

    @Post('projects/:id/teams')
    @SuccessMessage('Team created.')
    create(@CurrentUser() user: CurrentUserPayload, @Param('id') projectId: string, @Body() dto: CreateTeamDto) {
        return this.teamsService.create(user, projectId, dto);
    }

    @Delete('teams/:id')
    @SuccessMessage('Team deleted.')
    remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.teamsService.remove(user, id);
    }

    @Post('teams/:id/members')
    @SuccessMessage('Member added to team.')
    addMember(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: AddTeamMemberDto) {
        return this.teamsService.addMember(user, id, dto);
    }

    @Patch('teams/:id/members/:userId/lead')
    @SuccessMessage('Team lead updated.')
    setLead(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') id: string,
        @Param('userId') userId: string,
        @Body() dto: SetTeamLeadDto,
    ) {
        return this.teamsService.setLead(user, id, userId, dto);
    }

    @Delete('teams/:id/members/:userId')
    @SuccessMessage('Member removed from team.')
    removeMember(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Param('userId') userId: string) {
        return this.teamsService.removeMember(user, id, userId);
    }
}
