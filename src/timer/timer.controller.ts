import { Body, Controller, Get, Patch, Post } from '@nestjs/common';
import { TimerService } from './timer.service.js';
import { StartTimerDto } from './dto/start-timer.dto.js';
import { StopTimerDto } from './dto/stop-timer.dto.js';

@Controller('timer')
export class TimerController {
  constructor(private readonly timerService: TimerService) {}

  @Get('current')
  current() {
    return this.timerService.current();
  }

  @Post('start')
  start(@Body() dto: StartTimerDto) {
    return this.timerService.start(dto.taskId);
  }

  @Post('stop')
  stop(@Body() dto: StopTimerDto) {
    return this.timerService.stop(dto.endedAt);
  }

  @Patch('tick')
  tick() {
    return this.timerService.tick();
  }
}
