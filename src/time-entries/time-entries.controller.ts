import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service.js';
import { CreateTimeEntryDto } from './dto/create-time-entry.dto.js';
import { UpdateTimeEntryDto } from './dto/update-time-entry.dto.js';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Get()
  findAll(@Query('taskId') taskId?: string) {
    return this.timeEntriesService.findAll(taskId);
  }

  @Post()
  create(@Body() dto: CreateTimeEntryDto) {
    return this.timeEntriesService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTimeEntryDto) {
    return this.timeEntriesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.timeEntriesService.remove(id);
  }
}
