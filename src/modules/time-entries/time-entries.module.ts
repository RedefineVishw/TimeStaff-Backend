import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TimeEntriesService } from './time-entries.service.js';
import { TimeEntriesController } from './time-entries.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ProjectsModule],
    controllers: [TimeEntriesController],
    providers: [TimeEntriesService],
})
export class TimeEntriesModule { }
