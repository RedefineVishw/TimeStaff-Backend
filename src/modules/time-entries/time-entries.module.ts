import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TimeEntriesService } from './time-entries.service.js';
import { TimeEntriesController } from './time-entries.controller.js';
import { TimeEntryRequestsService } from './time-entry-requests.service.js';
import { TimeEntryRequestsController } from './time-entry-requests.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ProjectsModule, NotificationsModule],
    controllers: [TimeEntriesController, TimeEntryRequestsController],
    providers: [TimeEntriesService, TimeEntryRequestsService],
})
export class TimeEntriesModule { }
