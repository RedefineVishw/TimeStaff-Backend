import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
    @IsString()
    @IsNotEmpty({ message: 'Project name is required' })
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;
}
