import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { TrackingSettingsService } from './tracking-settings.service.js';
import { UpdateTrackingSettingsDto } from './dto/update-tracking-settings.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('organizations/:id/tracking-settings')
@UseGuards(JwtAuthGuard)
export class TrackingSettingsController {
    constructor(private readonly trackingSettingsService: TrackingSettingsService) { }

    // Readable by any authenticated org member (not just admins) — the
    // desktop app needs these values to configure itself for whichever user
    // is logged in.
    @Get()
    @SuccessMessage('Tracking settings retrieved.')
    get(@CurrentUser() user: CurrentUserPayload, @Param('id') organizationId: string) {
        return this.trackingSettingsService.get(user, organizationId);
    }

    @Patch()
    @UseGuards(PermissionsGuard)
    @RequirePermissions('tracking.settings.manage')
    @SuccessMessage('Tracking settings updated.')
    update(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') organizationId: string,
        @Body() dto: UpdateTrackingSettingsDto,
    ) {
        return this.trackingSettingsService.update(user, organizationId, dto);
    }
}
