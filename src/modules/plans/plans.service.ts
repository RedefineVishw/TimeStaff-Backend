import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class PlansService {
    constructor(private readonly prisma: PrismaService) { }

    // Public plan-selection screen — only PUBLIC, active plans. CUSTOM plans
    // are never listed here; they're only reachable by the specific org they
    // were negotiated for (via the QuoteRequest -> Super Admin flow).
    findPublicPlans() {
        return this.prisma.plan.findMany({
            where: { visibility: 'PUBLIC', isActive: true },
            include: { entitlements: true },
            orderBy: { basePrice: 'asc' },
        });
    }
}
