import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

// Coarse role check for Phase 1 (e.g. "only the org's ORGANIZATION_ADMIN can
// invite people or activate a plan"). Must run after JwtAuthGuard, since it
// reads req.user set by JwtStrategy. A finer-grained permission-string check
// (against the seeded Permission table) can replace this once Phase 2's
// feature endpoints need it.
@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());
        if (!requiredRoles || requiredRoles.length === 0) {
            return true;
        }

        const { user } = context.switchToHttp().getRequest();
        if (!user?.role?.name || !requiredRoles.includes(user.role.name)) {
            throw new ForbiddenException('You do not have permission to perform this action');
        }

        return true;
    }
}
