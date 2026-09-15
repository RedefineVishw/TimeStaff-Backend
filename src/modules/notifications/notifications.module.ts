import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
