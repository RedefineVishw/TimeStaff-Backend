import { IsDateString, IsOptional } from 'class-validator';

// When provided, this is used as the entry's endedAt instead of "now" — how
// the desktop app excludes an idle stretch from logged time: it passes the
// idle-since timestamp rather than the current time.
export class StopTimeEntryDto {
    @IsOptional()
    @IsDateString()
    endedAt?: string;
}
