import { Controller, Get, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('roles')
@UseGuards(JwtAuthGuard)
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Get()
    @SuccessMessage('Roles retrieved.')
    findAll() {
        return this.rolesService.findAll();
    }
}
