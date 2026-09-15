import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ProjectsService } from './projects.service.js';
import { ProjectsController } from './projects.controller.js';
import { ProjectAccessService } from './project-access.service.js';

@Module({
    // See OrganizationsModule for why PassportModule.register(...) is needed
    // here rather than a bare PassportModule import.
    imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
    controllers: [ProjectsController],
    providers: [ProjectsService, ProjectAccessService],
    // TasksModule and TimeEntriesModule both need the same access checks.
    exports: [ProjectAccessService],
})
export class ProjectsModule { }
