import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TimerModule } from './timer/timer.module.js';
import { TimeEntriesModule } from './time-entries/time-entries.module.js';
import { SettingsModule } from './settings/settings.module.js';

@Module({
  imports: [PrismaModule, ProjectsModule, TimerModule, TimeEntriesModule, SettingsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
