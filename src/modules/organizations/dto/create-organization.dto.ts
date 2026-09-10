import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateOrganizationDto {
    @IsString()
    @IsNotEmpty({ message: 'Organization name is required' })
    @MinLength(2, { message: 'Organization name must be at least 2 characters' })
    name!: string;
}
