import { CanActivate, ExecutionContext, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ENTITLEMENT_KEY } from '../decorators/entitlement.decorator.js';
import type { CurrentUserPayload } from '../types/current-user.type.js';

// Checks the org's active Subscription -> Plan -> PlanEntitlement, not the
// user's role — a role can grant permission to do something the org's
// current plan simply doesn't include (e.g. an EMPLOYEE with time.create
// on the Starter plan, which has no time_tracking entitlement). Must run
// after JwtAuthGuard, since it reads req.user.
@Injectable()
export class EntitlementGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // getAllAndOverride, not get(..., context.getHandler()) alone —
        // @RequireEntitlement is applied at the controller class level
        // (TimeEntriesController, ScreenshotsController), and a method
        // function has no prototypal link to its class, so handler-only
        // lookup silently missed class-level metadata (feature always
        // undefined, guard always passing regardless of plan). This checks
        // the handler first, falling back to the class, matching how
        // NestJS's own guards are meant to combine method + class metadata.
        const feature = this.reflector.getAllAndOverride<string>(ENTITLEMENT_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!feature) {
            return true;
        }

        const user: CurrentUserPayload = context.switchToHttp().getRequest().user;
        if (!user?.organizationId) {
            throw new ForbiddenException('You must belong to an organization');
        }

        const subscription = await this.prisma.subscription.findUnique({
            where: { organizationId: user.organizationId },
            include: { plan: { include: { entitlements: true } } },
        });

        const entitlement = subscription?.plan.entitlements.find((e) => e.feature === feature);
        if (!subscription || subscription.status !== 'ACTIVE' || entitlement?.value !== 'true') {
            throw new HttpException(
                `Your current plan does not include this feature (${feature})`,
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        return true;
    }
}
