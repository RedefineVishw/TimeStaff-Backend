import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

const REFRESH_COOKIE = 'refreshToken';
// Matches JWT_REFRESH_EXPIRY's default (7d) — keep these two in sync.
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
    constructor (private readonly authService: AuthService) { }

    @Post('register')
    @SuccessMessage('Registration successful. Please check your email for verification instructions.')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Get('verify-email')
    @SuccessMessage('Email verified successfully.')
    verifyEmail(@Query() dto: VerifyEmailDto) {
        return this.authService.verifyEmail(dto.token);
    }

    @Post('resend-verification')
    @SuccessMessage('If that email needs verifying, a new link has been sent.')
    resendVerification(@Body() dto: ResendVerificationDto) {
        return this.authService.resendVerification(dto);
    }

    @Post('accept-invite')
    @SuccessMessage('Invite accepted. You can now log in.')
    acceptInvite(@Body() dto: AcceptInviteDto) {
        return this.authService.acceptInvite(dto);
    }

    @Post('login')
    @SuccessMessage('Login successful.')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const { accessToken, refreshToken, user } = await this.authService.login(dto);
        this.setRefreshCookie(res, refreshToken);
        return { accessToken, user };
    }

    @Post('refresh')
    @SuccessMessage('Session refreshed.')
    async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
        const refreshToken = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
        const tokens = await this.authService.refresh(refreshToken);
        this.setRefreshCookie(res, tokens.refreshToken);
        return { accessToken: tokens.accessToken };
    }

    @Post('logout')
    @SuccessMessage('Logged out.')
    logout(@Res({ passthrough: true }) res: Response) {
        // Stateless JWT refresh tokens aren't tracked server-side (no table
        // for them), so "logout" just means dropping the cookie that carries
        // one — the token itself stays technically valid until it expires.
        res.clearCookie(REFRESH_COOKIE);
        return null;
    }

    private setRefreshCookie(res: Response, refreshToken: string) {
        res.cookie(REFRESH_COOKIE, refreshToken, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env['NODE_ENV'] === 'production',
            maxAge: REFRESH_COOKIE_MAX_AGE_MS,
        });
    }
}
