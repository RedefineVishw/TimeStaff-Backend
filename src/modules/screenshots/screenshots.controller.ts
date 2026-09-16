import { join } from 'node:path';
import {
    BadRequestException,
    Controller,
    Get,
    Param,
    Post,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request, Response } from 'express';
import { ScreenshotsService, SCREENSHOTS_ROOT, screenshotDir, screenshotFilename, ensureScreenshotDir } from './screenshots.service.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { EntitlementGuard } from '../../common/guards/entitlement.guard.js';
import { RequireEntitlement } from '../../common/decorators/entitlement.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

const MAX_SCREENSHOT_BYTES = 10 * 1024 * 1024; // 10MB — a full-screen PNG/JPEG comfortably fits.
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const storage = diskStorage({
    destination: (req: Request, _file, callback) => {
        const user = req.user as CurrentUserPayload | undefined;
        if (!user?.organizationId) {
            callback(new BadRequestException('You must belong to an organization'), '');
            return;
        }
        const relativeDir = screenshotDir(user.organizationId, user.id, new Date());
        const absoluteDir = join(SCREENSHOTS_ROOT, relativeDir);
        ensureScreenshotDir(absoluteDir);
        // Stash the relative dir on the request so the controller can build
        // the DB-stored relative path without recomputing "today" a second
        // time (avoids a midnight-boundary mismatch between the two calls).
        (req as Request & { screenshotRelativeDir?: string }).screenshotRelativeDir = relativeDir;
        callback(null, absoluteDir);
    },
    filename: (_req, file, callback) => {
        callback(null, screenshotFilename(file.originalname));
    },
});

// Requires the org's plan to include the `screenshots` entitlement
// (Growth/Enterprise only, per prisma/bootstrap.ts) — a separate axis from
// the running-timer check inside ScreenshotsService.
@Controller()
@UseGuards(JwtAuthGuard, EntitlementGuard)
@RequireEntitlement('screenshots')
export class ScreenshotsController {
    constructor(private readonly screenshotsService: ScreenshotsService) { }

    @Post('tasks/:id/screenshots')
    @SuccessMessage('Screenshot uploaded.')
    @UseInterceptors(
        FileInterceptor('file', {
            storage,
            limits: { fileSize: MAX_SCREENSHOT_BYTES },
            fileFilter: (_req, file, callback) => {
                callback(null, ALLOWED_MIME_TYPES.has(file.mimetype));
            },
        }),
    )
    async upload(
        @CurrentUser() user: CurrentUserPayload,
        @Param('id') taskId: string,
        @UploadedFile() file: Express.Multer.File | undefined,
        @Req() req: Request,
    ) {
        if (!file) {
            throw new BadRequestException('A screenshot file (field "file", image/png|jpeg|webp) is required');
        }
        const relativeDir = (req as Request & { screenshotRelativeDir?: string }).screenshotRelativeDir!;
        const relativeFilePath = join(relativeDir, file.filename);
        return this.screenshotsService.create(user, taskId, relativeFilePath);
    }

    @Get('screenshots/:id/file')
    async getFile(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Res() res: Response) {
        const { absolutePath } = await this.screenshotsService.getFileInfo(user, id);
        res.sendFile(absolutePath);
    }
}
