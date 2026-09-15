import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

@Injectable()
export class TimeEntriesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
    ) { }

    async start(user: CurrentUserPayload, taskId: string) {
        const task = await this.getLeafTaskOrThrow(taskId);
        await this.access.assertPermission(user, task.projectId, 'time.create');

        // Only one running timer per user at a time — starting a new one
        // auto-stops whichever is already running, rather than erroring.
        const running = await this.prisma.timeEntry.findFirst({
            where: { userId: user.id, endedAt: null },
        });
        if (running) {
            await this.stopEntry(running.id, running.startedAt);
        }

        return this.prisma.timeEntry.create({
            data: { taskId, userId: user.id, startedAt: new Date(), endedAt: null },
        });
    }

    async stop(user: CurrentUserPayload, id: string) {
        const entry = await this.prisma.timeEntry.findUnique({ where: { id } });
        if (!entry) {
            throw new NotFoundException('Time entry not found');
        }
        if (entry.userId !== user.id) {
            throw new ForbiddenException('You can only stop your own timer');
        }
        if (entry.endedAt) {
            throw new BadRequestException('This timer has already been stopped');
        }
        return this.stopEntry(id, entry.startedAt);
    }

    async createManual(user: CurrentUserPayload, taskId: string, dto: CreateTimeEntryDto) {
        const task = await this.getLeafTaskOrThrow(taskId);
        await this.access.assertPermission(user, task.projectId, 'time.create');

        const startedAt = new Date(dto.startedAt);
        const endedAt = new Date(dto.endedAt);
        if (endedAt <= startedAt) {
            throw new BadRequestException('endedAt must be after startedAt');
        }

        return this.prisma.timeEntry.create({
            data: {
                taskId,
                userId: user.id,
                startedAt,
                endedAt,
                durationSec: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
                note: dto.note,
            },
        });
    }

    // The caller's own time entries only, for now — a "team view" for
    // holders of time.approve is a natural follow-up, not built yet.
    findAllForUser(user: CurrentUserPayload, taskId?: string) {
        return this.prisma.timeEntry.findMany({
            where: { userId: user.id, ...(taskId ? { taskId } : {}) },
            orderBy: { startedAt: 'desc' },
            take: 100,
        });
    }

    async findAllForTask(user: CurrentUserPayload, taskId: string) {
        const task = await this.prisma.task.findUnique({ where: { id: taskId } });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        await this.access.assertPermission(user, task.projectId, 'time.view');
        return this.prisma.timeEntry.findMany({ where: { taskId }, orderBy: { startedAt: 'desc' } });
    }

    private async getLeafTaskOrThrow(taskId: string) {
        const task = await this.prisma.task.findUnique({
            where: { id: taskId },
            include: { _count: { select: { subtasks: true } } },
        });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        if (task._count.subtasks > 0) {
            throw new BadRequestException('Time can only be tracked on a task with no subtasks');
        }
        return task;
    }

    private stopEntry(id: string, startedAt: Date) {
        const endedAt = new Date();
        return this.prisma.timeEntry.update({
            where: { id },
            data: {
                endedAt,
                durationSec: Math.round((endedAt.getTime() - startedAt.getTime()) / 1000),
            },
        });
    }
}
