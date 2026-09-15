import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTeamDto {
    @IsString()
    @IsNotEmpty({ message: 'Team name is required' })
    name!: string;
}
