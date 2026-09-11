import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class SuperAdminLoginDto {
    @IsEmail({}, { message: 'Enter a valid email address' })
    email!: string;

    @IsString()
    @IsNotEmpty({ message: 'Password is required' })
    password!: string;
}
