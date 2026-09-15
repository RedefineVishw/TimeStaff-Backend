import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Project name cannot be empty' })
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;
}
