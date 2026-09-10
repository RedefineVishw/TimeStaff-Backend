import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SubscriptionsService } from './subscriptions.service.js';
import { SubscriptionsController } from './subscriptions.controller.js';

@Module({
    // JwtAuthGuard (AuthGuard('jwt')) needs PassportModule's provider
    // available in this module's own injector scope to resolve — importing
    // it via AuthModule's re-export doesn't reliably carry it through.
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [SubscriptionsController],
    providers: [SubscriptionsService],
})
export class SubscriptionsModule { }
