import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { TeamsService } from './teams.service.js';
import { TeamsController } from './teams.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ProjectsModule],
    controllers: [TeamsController],
    providers: [TeamsService],
})
export class TeamsModule { }
