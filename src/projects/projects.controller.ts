import { Controller, Get, Query } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll() {
    return this.projectsService.findAll();
  }

  @Get('summary')
  summary(@Query('range') range: string = 'week') {
    const safeRange = range === 'today' ? 'today' : 'week';
    return this.projectsService.summary(safeRange);
  }
}
