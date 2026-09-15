import { SetMetadata } from '@nestjs/common';

export const ENTITLEMENT_KEY = 'entitlement';

// Marks the PlanEntitlement feature key a route requires (e.g. 'time_tracking')
// — read by EntitlementGuard. Separate axis from role/permission checks: a
// role can permit an action the org's current plan simply doesn't include.
export const RequireEntitlement = (feature: string) => SetMetadata(ENTITLEMENT_KEY, feature);
