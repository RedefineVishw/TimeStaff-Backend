import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { TimeEntryRequestsService } from './time-entry-requests.service.js';
import { CreateTimeEntryRequestDto } from './dto/create-time-entry-request.dto.js';
import { UpdateTimeEntryRequestDto } from './dto/update-time-entry-request.dto.js';
import { DenyTimeEntryRequestDto } from './dto/deny-time-entry-request.dto.js';
import { FindTimeEntryRequestsDto } from './dto/find-time-entry-requests.dto.js';
import { FindApprovalOverviewDto } from './dto/find-approval-overview.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { EntitlementGuard } from '../../common/guards/entitlement.guard.js';
import { RequireEntitlement } from '../../common/decorators/entitlement.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

// Same entitlement axis as TimeEntriesController — manual time requests are
// still time tracking, just with a review step in front of it.
@Controller()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireEntitlement('time_tracking')
export class TimeEntryRequestsController {
    constructor(private readonly requests: TimeEntryRequestsService) { }

    @Post('tasks/:id/time-entries/requests')
    @SuccessMessage('Time request submitted.')
    create(@CurrentUser() user: CurrentUserPayload, @Param('id') taskId: string, @Body() dto: CreateTimeEntryRequestDto) {
        return this.requests.create(user, taskId, dto);
    }

    @Get('time-entries/requests/me')
    @SuccessMessage('Your time requests retrieved.')
    findMine(@CurrentUser() user: CurrentUserPayload, @Query() query: FindTimeEntryRequestsDto) {
        return this.requests.findMine(user, query);
    }

    @Patch('time-entries/requests/:id')
    @SuccessMessage('Time request updated.')
    update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateTimeEntryRequestDto) {
        return this.requests.update(user, id, dto);
    }

    @Patch('time-entries/requests/:id/cancel')
    @SuccessMessage('Time request cancelled.')
    cancel(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.requests.cancel(user, id);
    }

    @Get('time-entries/requests/pending')
    @SuccessMessage('Pending time requests retrieved.')
    findPending(@CurrentUser() user: CurrentUserPayload) {
        return this.requests.findPendingForApprover(user);
    }

    // The Approval Requests dashboard's data source — every status within
    // this approver's scope, so it can show real totals (pending/approved/
    // denied, and how many of those were reviewed by this approver
    // specifically), not just the pending queue.
    @Get('time-entries/requests/overview')
    @SuccessMessage('Approval overview retrieved.')
    findOverview(@CurrentUser() user: CurrentUserPayload, @Query() query: FindApprovalOverviewDto) {
        return this.requests.findAllInScope(user, query.userId);
    }

    // Lets the frontend hide the Approvals nav item/page entirely for
    // anyone with no approval authority, rather than showing it to everyone
    // and relying on the queue just being empty.
    @Get('time-entries/requests/can-approve')
    @SuccessMessage('Approval eligibility retrieved.')
    async canApprove(@CurrentUser() user: CurrentUserPayload) {
        return { canApprove: await this.requests.canApproveAnything(user) };
    }

    @Patch('time-entries/requests/:id/approve')
    @SuccessMessage('Time request approved.')
    approve(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.requests.approve(user, id);
    }

    @Patch('time-entries/requests/:id/deny')
    @SuccessMessage('Time request denied.')
    deny(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: DenyTimeEntryRequestDto) {
        return this.requests.deny(user, id, dto);
    }
}
