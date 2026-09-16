import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FindTimeEntriesDto {
    @IsOptional()
    @IsUUID('4')
    taskId?: string;

    @IsOptional()
    @IsDateString()
    from?: string;

    @IsOptional()
    @IsDateString()
    to?: string;
}
