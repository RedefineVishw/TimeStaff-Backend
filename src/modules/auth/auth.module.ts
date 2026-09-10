import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { MailModule } from '../../common/mail/mail.module.js';

@Module({
    // JwtModule isn't configured with a default secret here — every
    // sign/verify call in AuthService passes its own secret explicitly
    // (access vs. refresh use different ones).
    imports: [MailModule, PassportModule, JwtModule.register({})],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy],
    exports: [JwtModule, PassportModule],
})
export class AuthModule { }
