import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { PlansModule } from './modules/plans/plans.module.js';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module.js';

@Module({
  imports: [CommonModule, PrismaModule, AuthModule, OrganizationsModule, PlansModule, SubscriptionsModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
