import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';

@Module({
    // See OrganizationsModule for why PassportModule.register(...) is needed
    // here rather than a bare PassportModule import.
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [RolesController],
    providers: [RolesService],
})
export class RolesModule { }
