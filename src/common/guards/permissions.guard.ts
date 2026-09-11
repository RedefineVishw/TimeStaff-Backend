import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { CurrentUserPayload } from '../types/current-user.type.js';

// Checks the actual seeded Permission strings on the user's role, not just
// its name — the real RBAC check RolesGuard was a stand-in for. Must run
// after JwtAuthGuard, since it reads req.user (and its role.permissions
// array, populated by JwtStrategy.validate).
@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.get<string[]>(PERMISSIONS_KEY, context.getHandler());
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const user: CurrentUserPayload = context.switchToHttp().getRequest().user;
        const granted = new Set(user?.role?.permissions ?? []);
        const hasAll = requiredPermissions.every((p) => granted.has(p));

        if (!hasAll) {
            throw new ForbiddenException('You do not have permission to perform this action');
        }

        return true;
    }
}
