import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class TimerService {
  constructor(private readonly prisma: PrismaService) {}

  /** The entry currently running (endedAt = null), if any. */
  async current() {
    return this.prisma.timeEntry.findFirst({
      where: { endedAt: null },
      include: { task: { include: { project: true } } },
    });
  }

  async start(taskId: string) {
    // Only one timer can run at a time — close whatever's already running
    // before starting the new one, so we never end up with two open entries.
    await this.closeRunningEntry();

    return this.prisma.timeEntry.create({
      data: {
        taskId,
        startedAt: new Date(),
        endedAt: null,
        durationSeconds: 0,
        source: 'desktop',
      },
      include: { task: { include: { project: true } } },
    });
  }

  async stop() {
    const running = await this.prisma.timeEntry.findFirst({ where: { endedAt: null } });
    if (!running) {
      throw new NotFoundException('No timer is currently running');
    }
    return this.closeEntry(running.id, running.startedAt);
  }

  /** Desktop app calls this once a second while a timer is running. */
  async tick() {
    const running = await this.prisma.timeEntry.findFirst({ where: { endedAt: null } });
    if (!running) {
      throw new NotFoundException('No timer is currently running');
    }
    const durationSeconds = Math.floor((Date.now() - running.startedAt.getTime()) / 1000);
    return this.prisma.timeEntry.update({
      where: { id: running.id },
      data: { durationSeconds },
    });
  }

  private async closeRunningEntry() {
    const running = await this.prisma.timeEntry.findFirst({ where: { endedAt: null } });
    if (running) {
      await this.closeEntry(running.id, running.startedAt);
    }
  }

  private closeEntry(id: string, startedAt: Date) {
    const endedAt = new Date();
    const durationSeconds = Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000);
    return this.prisma.timeEntry.update({
      where: { id },
      data: { endedAt, durationSeconds },
      include: { task: { include: { project: true } } },
    });
  }
}
