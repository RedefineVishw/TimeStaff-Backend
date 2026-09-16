import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TrackingSettingsService } from './tracking-settings.service.js';
import { TrackingSettingsController } from './tracking-settings.controller.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [TrackingSettingsController],
    providers: [TrackingSettingsService],
})
export class TrackingSettingsModule { }
