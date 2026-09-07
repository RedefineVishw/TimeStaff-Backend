import { IsDateString, IsOptional, IsString } from 'class-validator';

// Manual edits from the web UI — every field optional so a request only
// needs to send what actually changed.
export class UpdateTimeEntryDto {
  @IsOptional()
  @IsString()
  taskId?: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @IsDateString()
  endedAt?: string;
}
