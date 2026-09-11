import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto.js';
import { CreatePlanFromQuoteDto } from './dto/create-plan-from-quote.dto.js';
import { SuperAdminAuthGuard } from './guards/super-admin-auth.guard.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('super-admin')
export class SuperAdminController {
    constructor(private readonly superAdminService: SuperAdminService) { }

    @Post('login')
    @SuccessMessage('Login successful.')
    login(@Body() dto: SuperAdminLoginDto) {
        return this.superAdminService.login(dto);
    }

    @Get('quote-requests')
    @UseGuards(SuperAdminAuthGuard)
    @SuccessMessage('Quote requests retrieved.')
    findQuoteRequests(@Query('status') status?: 'PENDING' | 'CONTACTED' | 'RESOLVED') {
        return this.superAdminService.findQuoteRequests(status);
    }

    @Post('quote-requests/:id/convert-to-plan')
    @UseGuards(SuperAdminAuthGuard)
    @SuccessMessage('Custom plan created from quote request.')
    convertQuoteToPlan(@Param('id') quoteRequestId: string, @Body() dto: CreatePlanFromQuoteDto) {
        return this.superAdminService.convertQuoteToPlan(quoteRequestId, dto);
    }
}
