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
        const comments = await this.prisma.taskComment.findMany({
            where: { taskId },
            include: { user: { select: { id: true, firstName: true, lastName: true } } },
            orderBy: { createdAt: 'asc' },
        });
        return this.withMentionedUsers(comments);
    }

    async create(user: CurrentUserPayload, taskId: string, dto: CreateCommentDto) {
        const task = await this.getTaskOrThrow(taskId);
        await this.access.assertAccess(user, task.projectId);

        // The composer sends whoever it let the user pick — still verify
        // server-side that each id is a real, active member of the same
        // organization before trusting it enough to (a) persist and (b)
        // notify. Also drop the commenter themself (mentioning yourself
        // shouldn't notify you) and de-dupe.
        const mentionedUserIds = await this.assertMentionable(user, [...new Set(dto.mentionedUserIds ?? [])]);

        const comment = await this.prisma.taskComment.create({
            data: { taskId, userId: user.id, body: dto.body, mentionedUserIds },
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

        // A mentioned user gets a distinct, more specific notification than
        // the generic "new comment" one above — skip anyone who'd otherwise
        // get both (the assignee, already notified just above) so tagging
        // the assignee doesn't double-notify them.
        for (const mentionedUserId of mentionedUserIds) {
            if (mentionedUserId === task.assigneeId) continue;
            await this.notifications.create({
                userId: mentionedUserId,
                type: 'TASK_MENTION',
                title: `You were mentioned in a comment on: ${task.title}`,
                entityType: 'Task',
                entityId: task.id,
            });
        }

        const [withMentions] = await this.withMentionedUsers([comment]);
        return withMentions;
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

    // Filters a candidate mention list down to ids that are real, valid
    // targets: not the commenter themself, and an active member of the same
    // organization. Silently drops anything else rather than rejecting the
    // whole comment — a stale/bad id in the list shouldn't block posting.
    private async assertMentionable(user: CurrentUserPayload, candidateIds: string[]): Promise<string[]> {
        const ids = candidateIds.filter((id) => id !== user.id);
        if (ids.length === 0) return [];

        const validUsers = await this.prisma.user.findMany({
            where: { id: { in: ids }, organizationId: user.organizationId, isActive: true },
            select: { id: true },
        });
        return validUsers.map((u) => u.id);
    }

    // Resolves each comment's mentionedUserIds into {id, firstName,
    // lastName} so the frontend can highlight "@Name" back to a real person
    // without a second round-trip — batched across all the comments passed
    // in rather than one lookup per comment.
    private async withMentionedUsers<T extends { mentionedUserIds: string[] }>(
        comments: T[],
    ): Promise<(T & { mentionedUsers: { id: string; firstName: string; lastName: string }[] })[]> {
        const allIds = [...new Set(comments.flatMap((c) => c.mentionedUserIds))];
        if (allIds.length === 0) {
            return comments.map((c) => ({ ...c, mentionedUsers: [] }));
        }

        const users = await this.prisma.user.findMany({
            where: { id: { in: allIds } },
            select: { id: true, firstName: true, lastName: true },
        });
        const byId = new Map(users.map((u) => [u.id, u]));

        return comments.map((c) => ({
            ...c,
            mentionedUsers: c.mentionedUserIds.map((id) => byId.get(id)).filter((u) => !!u),
        }));
    }

    private async getTaskOrThrow(id: string) {
        const task = await this.prisma.task.findUnique({ where: { id } });
        if (!task) {
            throw new NotFoundException('Task not found');
        }
        return task;
    }
}
