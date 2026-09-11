import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Applies the 'super-admin-jwt' strategy — separate from JwtAuthGuard
// (which validates org-user tokens). Put this on every /super-admin route.
@Injectable()
export class SuperAdminAuthGuard extends AuthGuard('super-admin-jwt') {}
