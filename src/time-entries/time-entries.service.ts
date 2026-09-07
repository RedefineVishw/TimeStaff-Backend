import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';

function durationSeconds(startedAt: Date, endedAt: Date): number {
  return Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
}

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(taskId?: string) {
    return this.prisma.timeEntry.findMany({
      where: taskId ? { taskId } : undefined,
      include: { task: { include: { project: true } } },
      orderBy: { startedAt: 'desc' },
    });
  }

  create(dto: CreateTimeEntryDto) {
    const startedAt = new Date(dto.startedAt);
    const endedAt = new Date(dto.endedAt);
    return this.prisma.timeEntry.create({
      data: {
        taskId: dto.taskId,
        startedAt,
        endedAt,
        durationSeconds: durationSeconds(startedAt, endedAt),
        source: 'web',
      },
      include: { task: { include: { project: true } } },
    });
  }

  async update(id: string, dto: UpdateTimeEntryDto) {
    const existing = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Time entry ${id} not found`);
    }

    const startedAt = dto.startedAt ? new Date(dto.startedAt) : existing.startedAt;
    const endedAt = dto.endedAt ? new Date(dto.endedAt) : existing.endedAt;

    return this.prisma.timeEntry.update({
      where: { id },
      data: {
        taskId: dto.taskId ?? existing.taskId,
        startedAt,
        endedAt,
        // Only recompute duration when we actually have both ends — a still
        // running entry (endedAt still null) keeps whatever tick() last set.
        durationSeconds: endedAt ? durationSeconds(startedAt, endedAt) : existing.durationSeconds,
      },
      include: { task: { include: { project: true } } },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.timeEntry.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Time entry ${id} not found`);
    }
    await this.prisma.timeEntry.delete({ where: { id } });
    return { id };
  }
}
