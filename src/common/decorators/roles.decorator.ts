import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Marks which role name(s) a route requires — read by RolesGuard.
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
