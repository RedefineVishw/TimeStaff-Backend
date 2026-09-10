import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
    @IsEmail({}, { message: 'Enter a valid email address' })
    email!: string;
}
