import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TasksService } from './tasks.service.js';
import { TaskCommentsService } from './task-comments.service.js';
import { TasksController } from './tasks.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ProjectsModule, NotificationsModule],
    controllers: [TasksController],
    providers: [TasksService, TaskCommentsService],
})
export class TasksModule { }
