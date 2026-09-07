import { Module } from '@nestjs/common';
import { TimerController } from './timer.controller.js';
import { TimerService } from './timer.service.js';

@Module({
  controllers: [TimerController],
  providers: [TimerService],
})
export class TimerModule {}
