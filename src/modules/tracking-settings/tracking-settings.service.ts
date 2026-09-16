import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UpdateTrackingSettingsDto } from './dto/update-tracking-settings.dto.js';
import type { CurrentUserPayload } from '../../common/types/current-user.type.js';

@Injectable()
export class TrackingSettingsService {
    constructor(private readonly prisma: PrismaService) { }

    // Auto-creates the row with schema defaults on first read — every org
    // effectively "has" settings from the moment it exists, without needing
    // to seed one at org-creation time.
    async get(user: CurrentUserPayload, organizationId: string) {
        this.assertBelongsToOrg(user, organizationId);
        const existing = await this.prisma.organizationTrackingSettings.findUnique({ where: { organizationId } });
        if (existing) return existing;

        return this.prisma.organizationTrackingSettings.create({
            data: { organizationId, updatedBy: user.id },
        });
    }

    async update(user: CurrentUserPayload, organizationId: string, dto: UpdateTrackingSettingsDto) {
        this.assertBelongsToOrg(user, organizationId);

        return this.prisma.organizationTrackingSettings.upsert({
            where: { organizationId },
            create: {
                organizationId,
                idleThresholdSec: dto.idleThresholdSec,
                screenshotIntervalSec: dto.screenshotIntervalSec,
                updatedBy: user.id,
            },
            update: {
                idleThresholdSec: dto.idleThresholdSec,
                screenshotIntervalSec: dto.screenshotIntervalSec,
                updatedBy: user.id,
            },
        });
    }

    private assertBelongsToOrg(user: CurrentUserPayload, organizationId: string) {
        if (user.organizationId !== organizationId) {
            throw new ForbiddenException('You do not have access to this organization');
        }
    }
}
