import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateSettingsDto } from './dto/update-settings.dto.js';

const SETTINGS_ID = 'singleton';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Upsert-on-read: the row may not exist yet on a fresh database, so GET
  // creates it with defaults the first time rather than requiring a seed step.
  get() {
    return this.prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID },
      update: {},
    });
  }

  update(dto: UpdateSettingsDto) {
    return this.prisma.appSettings.upsert({
      where: { id: SETTINGS_ID },
      create: { id: SETTINGS_ID, idleTimeoutMinutes: dto.idleTimeoutMinutes },
      update: { idleTimeoutMinutes: dto.idleTimeoutMinutes },
    });
  }
}
