import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';
import { SuperAdminModule } from './modules/super-admin/super-admin.module.js';
import { RolesModule } from './modules/roles/roles.module.js';

@Module({
  imports: [CommonModule, PrismaModule, AuthModule, OrganizationsModule, PlansModule, SubscriptionsModule, SuperAdminModule, RolesModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
