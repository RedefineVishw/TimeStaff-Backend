import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ProjectAccessService } from '../projects/project-access.service.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

// Local disk only, per the standing requirement — no third-party storage.
// Folder lives at the backend project's root, named literally `screenshots`.
export const SCREENSHOTS_ROOT = join(process.cwd(), 'screenshots');

// Shared by ScreenshotsController's multer config and this service, so the
// storage destination and the filePath saved to the DB always agree.
export function screenshotDir(organizationId: string, userId: string, takenAt: Date): string {
    const day = takenAt.toISOString().slice(0, 10); // yyyy-mm-dd
    return join(organizationId, userId, day);
}

@Injectable()
export class ScreenshotsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly access: ProjectAccessService,
    ) { }

    // Screenshots attach to an actively-running timer, not to a task in the
    // abstract — this is the anti-arbitrary-upload check: a caller can only
    // ever attach one to time they're genuinely tracking right now.
    async create(user: CurrentUserPayload, taskId: string, relativeFilePath: string) {
        const runningEntry = await this.prisma.timeEntry.findFirst({
            where: { taskId, userId: user.id, endedAt: null },
        });

        if (!runningEntry) {
            this.deleteFileQuietly(relativeFilePath);
            throw new BadRequestException('No running timer for this task — start the timer before capturing a screenshot');
        }
        if (!user.organizationId) {
            this.deleteFileQuietly(relativeFilePath);
            throw new BadRequestException('You must belong to an organization');
        }

        return this.prisma.screenshot.create({
            data: {
                timeEntryId: runningEntry.id,
                taskId,
                userId: user.id,
                organizationId: user.organizationId,
                filePath: relativeFilePath,
            },
        });
    }

    // Streams the file only after confirming the requester has access to
    // the underlying task's project — screenshots are per-org, per-user
    // sensitive data, never served from a guessable static path.
    async getFileInfo(user: CurrentUserPayload, id: string) {
        const screenshot = await this.prisma.screenshot.findUnique({
            where: { id },
            include: { task: true },
        });
        if (!screenshot) {
            throw new NotFoundException('Screenshot not found');
        }
        await this.access.assertAccess(user, screenshot.task.projectId);

        const absolutePath = join(SCREENSHOTS_ROOT, screenshot.filePath);
        if (!existsSync(absolutePath)) {
            throw new NotFoundException('Screenshot file is missing on disk');
        }
        return { absolutePath };
    }

    private deleteFileQuietly(relativeFilePath: string) {
        const absolutePath = join(SCREENSHOTS_ROOT, relativeFilePath);
        try {
            if (existsSync(absolutePath)) unlinkSync(absolutePath);
        } catch {
            // Best-effort cleanup — a leftover orphan file isn't worth
            // failing the request over.
        }
    }
}

export function ensureScreenshotDir(dir: string) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function screenshotFilename(originalName: string) {
    const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '.png';
    return `${Date.now()}-${randomUUID()}${ext}`;
}
