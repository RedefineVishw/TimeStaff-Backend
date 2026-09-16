import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { ScreenshotsService } from './screenshots.service.js';
import { ScreenshotsController } from './screenshots.controller.js';
import { ProjectsModule } from '../projects/projects.module.js';

@Module({
    imports: [PassportModule.register({ defaultStrategy: 'jwt' }), ProjectsModule],
    controllers: [ScreenshotsController],
    providers: [ScreenshotsService],
})
export class ScreenshotsModule { }
