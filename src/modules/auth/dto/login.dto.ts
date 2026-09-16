import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/normalize-email.util.js';

export class LoginDto {
    @NormalizeEmail()
    @IsEmail({}, { message: 'Enter a valid email address' })
    email!: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;
}
