import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service.js';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { EntitlementGuard } from '../../common/guards/entitlement.guard.js';
import { RequireEntitlement } from '../../common/decorators/entitlement.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

// Every route here requires the org's active plan to include time tracking
// — a separate axis from the role/permission checks inside the service.
@Controller()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireEntitlement('time_tracking')
export class TimeEntriesController {
    constructor(private readonly timeEntriesService: TimeEntriesService) { }

    @Post('tasks/:id/time-entries/start')
    @SuccessMessage('Timer started.')
    start(@CurrentUser() user: CurrentUserPayload, @Param('id') taskId: string) {
        return this.timeEntriesService.start(user, taskId);
    }

    @Post('time-entries/:id/stop')
    @SuccessMessage('Timer stopped.')
    stop(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.timeEntriesService.stop(user, id);
    }

    @Post('tasks/:id/time-entries')
    @SuccessMessage('Time logged.')
    createManual(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') taskId: string,
        @Body() dto: CreateTimeEntryDto,
    ) {
        return this.timeEntriesService.createManual(user, taskId, dto);
    }

    @Get('time-entries')
    @SuccessMessage('Time entries retrieved.')
    findAllForUser(@CurrentUser() user: CurrentUserPayload, @Query('taskId') taskId?: string) {
        return this.timeEntriesService.findAllForUser(user, taskId);
    }

    @Get('tasks/:id/time-entries')
    @SuccessMessage('Time entries retrieved.')
    findAllForTask(@CurrentUser() user: CurrentUserPayload, @Param('id') taskId: string) {
        return this.timeEntriesService.findAllForTask(user, taskId);
    }
}
