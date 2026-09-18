import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

@Injectable()
export class NotificationsService {
    constructor(private readonly prisma: PrismaService) { }

    // Internal helper, not exposed via the controller — called by
    // TasksService on events like assignment or status change.
    create(params: {
        userId: string;
        type: string;
        title: string;
        message?: string;
        entityType?: string;
        entityId?: string;
    }) {
        return this.prisma.notification.create({ data: params });
    }

    // The Inbox is task activity only — assignment, status changes,
    // comments, mentions — not every internal event that happens to create
    // a Notification row (e.g. manual-time-request submissions/approvals,
    // which have their own dedicated views: the requester's "Manual Time
    // Requests" tab and the reviewer's Approvals queue). Scoping by
    // entityType: 'Task' rather than an allowlist of `type` strings means
    // any future task-event type is included automatically, and anything
    // else stays out without needing to remember to exclude it here.
    findAllForUser(user: CurrentUserPayload, isRead?: boolean) {
        return this.prisma.notification.findMany({
            where: { userId: user.id, entityType: 'Task', ...(isRead !== undefined ? { isRead } : {}) },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
    }

    async markRead(user: CurrentUserPayload, id: string) {
        const notification = await this.prisma.notification.findUnique({ where: { id } });
        if (!notification) {
            throw new NotFoundException('Notification not found');
        }
        if (notification.userId !== user.id) {
            throw new ForbiddenException('This notification does not belong to you');
        }
        return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
    }

    async markAllRead(user: CurrentUserPayload) {
        // Scoped the same way as findAllForUser — "mark all as read" should
        // only affect what the Inbox actually shows, not silently mark
        // unrelated notifications (e.g. time-request events) as read behind
        // the scenes when the user never saw them there.
        const result = await this.prisma.notification.updateMany({
            where: { userId: user.id, entityType: 'Task', isRead: false },
            data: { isRead: true },
        });
        return { count: result.count };
    }
}
