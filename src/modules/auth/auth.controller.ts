import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

@Controller('auth')
export class AuthController {
    constructor (private readonly authService: AuthService) { }

    @Post('register')
    @SuccessMessage('Registration successful. Please check your email for verification instructions.')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }
}