import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

// Marks the exact permission string(s) a route requires (from the seeded
// Permission table, e.g. 'user.create') — read by PermissionsGuard. A route
// with more than one required permission needs ALL of them (AND, not OR).
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
