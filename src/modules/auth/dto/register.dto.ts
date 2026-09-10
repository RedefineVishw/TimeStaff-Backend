import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail({}, { message: 'Enter a valid email address' })
    email!: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).+$/, {
        message:
            'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    })
    password!: string;

    @IsString()
    @IsNotEmpty({ message: 'First name is required' })
    firstName!: string;

    @IsString()
    @IsNotEmpty({ message: 'Last name is required' })
    lastName!: string;
}
