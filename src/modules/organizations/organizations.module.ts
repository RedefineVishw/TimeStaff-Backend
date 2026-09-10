import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationsController } from './organizations.controller.js';
import { MailModule } from '../../common/mail/mail.module.js';

@Module({
    // JwtAuthGuard (AuthGuard('jwt')) needs PassportModule's provider
    // available in this module's own injector scope to resolve — importing
    // it via AuthModule's re-export doesn't reliably carry it through.
    imports: [MailModule, PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [OrganizationsController],
    providers: [OrganizationsService],
})
export class OrganizationsModule { }
