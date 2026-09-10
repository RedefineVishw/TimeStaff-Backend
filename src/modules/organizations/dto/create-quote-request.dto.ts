import { IsOptional, IsString } from 'class-validator';

export class CreateQuoteRequestDto {
    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsString()
    contactPhone?: string;
}
