import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const projects = await this.prisma.project.findMany({
      include: { tasks: { include: { timeEntries: true } } },
      orderBy: { createdAt: 'asc' },
    });

    // Shape the response: attach a computed totalSeconds per task and per project
    // instead of shipping the raw timeEntries array to the client.
    return projects.map((project) => {
      const tasks = project.tasks.map((task) => ({
        id: task.id,
        name: task.name,
        totalSeconds: task.timeEntries.reduce((sum, e) => sum + e.durationSeconds, 0),
      }));
      return {
        id: project.id,
        name: project.name,
        color: project.color,
        totalSeconds: tasks.reduce((sum, t) => sum + t.totalSeconds, 0),
        tasks,
      };
    });
  }

  async summary(range: 'today' | 'week') {
    const since = new Date();
    if (range === 'today') {
      since.setHours(0, 0, 0, 0);
    } else {
      since.setDate(since.getDate() - 7);
    }

    const projects = await this.prisma.project.findMany({
      include: { tasks: { include: { timeEntries: { where: { startedAt: { gte: since } } } } } },
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      totalSeconds: project.tasks.reduce(
        (sum, t) => sum + t.timeEntries.reduce((s, e) => s + e.durationSeconds, 0),
        0,
      ),
    }));
  }
}