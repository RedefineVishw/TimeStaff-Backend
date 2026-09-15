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

    findAllForUser(user: CurrentUserPayload, isRead?: boolean) {
        return this.prisma.notification.findMany({
            where: { userId: user.id, ...(isRead !== undefined ? { isRead } : {}) },
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
        const result = await this.prisma.notification.updateMany({
            where: { userId: user.id, isRead: false },
            data: { isRead: true },
        });
        return { count: result.count };
    }
}
