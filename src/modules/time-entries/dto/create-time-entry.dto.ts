import { IsDateString, IsOptional, IsString } from 'class-validator';

// Manual log entry — an alternative to start/stop for time already worked.
export class CreateTimeEntryDto {
    @IsDateString()
    startedAt!: string;

    @IsDateString()
    endedAt!: string;

    @IsOptional()
    @IsString()
    note?: string;
}
