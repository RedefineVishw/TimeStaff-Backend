import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    @SuccessMessage('Notifications retrieved.')
    findAll(@CurrentUser() user: CurrentUserPayload, @Query('isRead') isRead?: string) {
        const filter = isRead === undefined ? undefined : isRead === 'true';
        return this.notificationsService.findAllForUser(user, filter);
    }

    @Patch(':id/read')
    @SuccessMessage('Notification marked as read.')
    markRead(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
        return this.notificationsService.markRead(user, id);
    }

    @Patch('read-all')
    @SuccessMessage('All notifications marked as read.')
    markAllRead(@CurrentUser() user: CurrentUserPayload) {
        return this.notificationsService.markAllRead(user);
    }
}
