import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class AcceptInviteDto {
    @IsString()
    @IsNotEmpty({ message: 'Invite token is required' })
    token!: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    password!: string;
}
