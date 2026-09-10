import { BadRequestException, ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { ResendVerificationDto } from './dto/resend-verification.dto.js';
import { AcceptInviteDto } from './dto/accept-invite.dto.js';
import { hashPassword, comparePasswords } from '../../common/utils/password.util.js';
import { generateVerificationToken, getTokenExpiry } from '../../common/utils/token.util.js';
import { MailService } from '../../common/mail/mail.service.js';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
        private readonly jwtService: JwtService,
    ) { }

    async register(dto: RegisterDto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new ConflictException('An account with this email already exists');
        }

        const passwordHash = await hashPassword(dto.password);
        const verificationToken = generateVerificationToken();
        const verificationTokenExpiresAt = getTokenExpiry();

        await this.mailService.sendVerificationEmail(dto.email, verificationToken);
        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName,
                verificationToken,
                verificationTokenExpiresAt,
            },
        });


        return { id: user.id, email: user.email };
    }

    async verifyEmail(token: string) {
        const user = await this.prisma.user.findUnique({ where: { verificationToken: token } });
        if (!user) {
            throw new BadRequestException('Invalid or expired verification token');
        }

        if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
            throw new BadRequestException('Verification token has expired. Please request a new one.');
        }

        const verifiedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifiedAt: new Date(),
                verificationToken: null,
                verificationTokenExpiresAt: null,
            },
        });

        return { id: verifiedUser.id, email: verifiedUser.email };
    }

    async resendVerification(dto: ResendVerificationDto) {
        const user = await this.prisma.user.findUnique({ where: { email: dto.email } });

        // Same generic response whether the email doesn't exist or is already
        // verified — don't let this endpoint be used to probe which emails
        // are registered.
        if (!user || user.emailVerified) {
            return { message: 'If that email needs verifying, a new link has been sent.' };
        }

        const verificationToken = generateVerificationToken();
        const verificationTokenExpiresAt = getTokenExpiry();

        await this.mailService.sendVerificationEmail(user.email, verificationToken);
        await this.prisma.user.update({
            where: { id: user.id },
            data: { verificationToken, verificationTokenExpiresAt },
        });

        return { message: 'If that email needs verifying, a new link has been sent.' };
    }

    // Completes an invite: the User row already exists (created by
    // OrganizationsService.invite with org/role pre-set, passwordHash null),
    // this just sets the password and flips it to verified — same shape as
    // verifyEmail, plus the password step self-registration doesn't need.
    async acceptInvite(dto: AcceptInviteDto) {
        const user = await this.prisma.user.findUnique({ where: { verificationToken: dto.token } });
        if (!user) {
            throw new BadRequestException('Invalid or expired invite token');
        }

        if (!user.verificationTokenExpiresAt || user.verificationTokenExpiresAt < new Date()) {
            throw new BadRequestException('This invite has expired. Ask the organization owner to resend it.');
        }

        const passwordHash = await hashPassword(dto.password);
        const acceptedUser = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                emailVerified: true,
                emailVerifiedAt: new Date(),
                verificationToken: null,
                verificationTokenExpiresAt: null,
            },
        });

        return { id: acceptedUser.id, email: acceptedUser.email };
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email },
            include: { role: true },
        });

        // Same message for "no such user" and "wrong password" — don't leak
        // which emails are registered.
        if (!user || !user.passwordHash || !(await comparePasswords(dto.password, user.passwordHash))) {
            throw new UnauthorizedException('Invalid email or password');
        }

        if (!user.emailVerified) {
            throw new ForbiddenException('Please verify your email before logging in');
        }

        if (!user.isActive) {
            throw new ForbiddenException('This account has been deactivated');
        }

        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
        });

        const tokens = await this.generateTokens(user.id, user.email);
        return {
            ...tokens,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                organizationId: user.organizationId,
                role: user.role?.name ?? null,
            },
        };
    }

    async refresh(refreshToken: string | undefined) {
        if (!refreshToken) {
            throw new UnauthorizedException('No refresh token provided');
        }

        let payload: { sub: string; email: string };
        try {
            payload = await this.jwtService.verifyAsync(refreshToken, {
                secret: process.env['JWT_REFRESH_SECRET'],
            });
        } catch {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        return this.generateTokens(user.id, user.email);
    }

    private async generateTokens(userId: string, email: string) {
        const payload = { sub: userId, email };

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: process.env['JWT_ACCESS_SECRET'],
            // `ms`'s StringValue type won't widen to plain `string` — env
            // vars are always `string`, so this needs an explicit cast.
            expiresIn: (process.env['JWT_ACCESS_EXPIRY'] ?? '15m') as unknown as number,
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: process.env['JWT_REFRESH_SECRET'],
            expiresIn: (process.env['JWT_REFRESH_EXPIRY'] ?? '7d') as unknown as number,
        });

        return { accessToken, refreshToken };
    }
}
