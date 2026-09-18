import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTimeEntryRequestDto {
    @IsOptional()
    @IsDateString()
    startedAt?: string;

    @IsOptional()
    @IsDateString()
    endedAt?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2000)
    note?: string;
}
