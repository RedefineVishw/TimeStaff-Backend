import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { SuperAdminService } from './super-admin.service.js';
import { SuperAdminController } from './super-admin.controller.js';
import { SuperAdminJwtStrategy } from './strategies/super-admin-jwt.strategy.js';

@Module({
    // PassportModule.register(...), not bare PassportModule — SuperAdminAuthGuard
    // (AuthGuard('super-admin-jwt')) needs AuthModuleOptions resolvable in
    // this module's own injector scope, same quirk hit in the other guarded
    // modules (see their comments for the full explanation).
    imports: [PassportModule.register({ defaultStrategy: 'super-admin-jwt' }), JwtModule.register({})],
    controllers: [SuperAdminController],
    providers: [SuperAdminService, SuperAdminJwtStrategy],
})
export class SuperAdminModule { }
