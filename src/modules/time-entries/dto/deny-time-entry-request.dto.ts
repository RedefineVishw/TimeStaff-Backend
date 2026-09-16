import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DenyTimeEntryRequestDto {
    @IsOptional()
    @IsString()
    @MaxLength(2000)
    reviewNote?: string;
}
