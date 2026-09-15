import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

// A task's discussion thread — open to any project member (same access
// level as viewing the task), no separate permission required to post.
@Injectable()
export class TaskCommentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
        private readonly notifications: NotificationsService,
    ) { }

    async findAll(user: CurrentUserPayload, taskId: string) {
        const task = await this.getTaskOrThrow(taskId);
        await this.access.assertAccess(user, task.projectId);
        return this.prisma.taskComment.findMany({
            where: { taskId },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }

    async create(user: CurrentUserPayload, taskId: string, dto: CreateCommentDto) {
        const task = await this.getTaskOrThrow(taskId);
        await this.access.assertAccess(user, task.projectId);

        const comment = await this.prisma.taskComment.create({
            data: { taskId, userId: user.id, body: dto.body },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
        });

        if (task.assigneeId && task.assigneeId !== user.id) {
            await this.notifications.create({
                userId: task.assigneeId,
                type: 'TASK_COMMENT',
                title: `New comment on: ${task.title}`,
                entityType: 'Task',
                entityId: task.id,
            });
        }

        return comment;
    }

    async remove(user: CurrentUserPayload, commentId: string) {
        const comment = await this.prisma.taskComment.findUnique({ where: { id: commentId } });
        if (!comment) {
            throw new NotFoundException('Comment not found');
        }
        if (comment.userId !== user.id) {
            throw new ForbiddenException('You can only delete your own comments');
        }
        await this.prisma.taskComment.delete({ where: { id: commentId } });
        return { id: commentId };
    }

    private async getTaskOrThrow(id: string) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        return task;
    }
}
