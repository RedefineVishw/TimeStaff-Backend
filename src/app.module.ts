import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module.js';
import { CommonModule } from './common/common.module.js';
import { AuthModule } from './modules/auth/auth.module.js';

@Module({
  imports: [CommonModule, PrismaModule, AuthModule],
  controllers: [],
  providers: [],
})
export class AppModule { }
