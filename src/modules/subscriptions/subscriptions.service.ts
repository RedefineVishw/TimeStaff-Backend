import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { CreateSubscriptionDto } from './dto/create-subscription.dto.js';
import { CurrentUserPayload } from '../../common/types/current-user.type.js';

@Injectable()
export class SubscriptionsService {
    constructor(private readonly prisma: PrismaService) { }

    // Activates (or changes) an org's plan. No real payment gateway — this
    // simulates a successful charge, matching the "dummy payment" scope
    // agreed for Phase 1.
    async activate(currentUser: CurrentUserPayload, dto: CreateSubscriptionDto) {
        if (!currentUser.organizationId) {
            throw new BadRequestException('You must create an organization before choosing a plan');
        }

        const plan = await this.prisma.plan.findUnique({ where: { id: dto.planId } });
        if (!plan || !plan.isActive) {
            throw new NotFoundException('Plan not found');
        }

        if (plan.visibility === 'CUSTOM' && plan.organizationId !== currentUser.organizationId) {
            throw new ForbiddenException('This plan is not available to your organization');
        }

        const finalPrice = plan.basePrice;
        const startDate = new Date();
        const endDate = this.computeEndDate(startDate, plan.billingCycle);

        const existing = await this.prisma.subscription.findUnique({
            where: { organizationId: currentUser.organizationId },
        });

        const subscription = await this.prisma.subscription.upsert({
            where: { organizationId: currentUser.organizationId },
            create: {
                organizationId: currentUser.organizationId,
                planId: plan.id,
                status: 'ACTIVE',
                billingCycle: plan.billingCycle,
                basePrice: plan.basePrice,
                additionalCharge: 0,
                finalPrice,
                startDate,
                endDate,
            },
            update: {
                planId: plan.id,
                status: 'ACTIVE',
                billingCycle: plan.billingCycle,
                basePrice: plan.basePrice,
                finalPrice,
                startDate,
                endDate,
                cancelAtPeriodEnd: false,
            },
        });

        await this.prisma.subscriptionHistory.create({
            data: {
                subscriptionId: subscription.id,
                action: existing ? 'CHANGED' : 'ACTIVATED',
                oldPlanId: existing?.planId,
                newPlanId: plan.id,
                oldPrice: existing?.finalPrice,
                newPrice: finalPrice,
                changedBy: currentUser.id,
            },
        });

        await this.prisma.payment.create({
            data: {
                organizationId: currentUser.organizationId,
                subscriptionId: subscription.id,
                amount: finalPrice,
                status: 'SUCCESS',
                paymentMethod: 'DUMMY',
                paidAt: new Date(),
            },
        });

        await this.prisma.organization.update({
            where: { id: currentUser.organizationId },
            data: { status: 'ACTIVE', updatedBy: currentUser.id },
        });

        return subscription;
    }

    private computeEndDate(start: Date, billingCycle: 'MONTHLY' | 'YEARLY'): Date {
        const end = new Date(start);
        if (billingCycle === 'MONTHLY') {
            end.setMonth(end.getMonth() + 1);
        } else {
            end.setFullYear(end.getFullYear() + 1);
        }
        return end;
    }
}
