import { IsDateString, IsOptional } from 'class-validator';

export class StopTimerDto {
  // Optional retroactive stop time — lets a caller (the desktop app, after
  // detecting the user went idle) close the entry as of when idle actually
  // started, discarding the idle stretch, instead of counting it as worked
  // time up to the moment the idle check fired.
  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
