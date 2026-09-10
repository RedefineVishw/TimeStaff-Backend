import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
    constructor(private readonly organizationsService: OrganizationsService) { }

    @Post()
    @SuccessMessage('Organization created.')
    create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateOrganizationDto) {
        return this.organizationsService.create(user, dto);
    }

    @Post(':id/invite')
    @UseGuards(RolesGuard)
    @Roles('ORGANIZATION_ADMIN')
    @SuccessMessage('Invite sent.')
    invite(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') organizationId: string,
        @Body() dto: InviteUserDto,
    ) {
        return this.organizationsService.invite(user, organizationId, dto);
    }

    @Post(':id/quote-requests')
    @UseGuards(RolesGuard)
    @Roles('ORGANIZATION_ADMIN')
    @SuccessMessage('Quote request submitted. Our team will be in touch.')
    createQuoteRequest(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') organizationId: string,
        @Body() dto: CreateQuoteRequestDto,
    ) {
        return this.organizationsService.createQuoteRequest(user, organizationId, dto);
    }
}
