import { IsEmail } from 'class-validator';
import { NormalizeEmail } from '../../../common/utils/normalize-email.util.js';

export class ResendVerificationDto {
    @NormalizeEmail()
    @IsEmail({}, { message: 'Enter a valid email address' })
    email!: string;
}
