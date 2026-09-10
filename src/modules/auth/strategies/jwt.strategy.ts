import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';

export interface JwtPayload {
    sub: string;
    email: string;
}

// Validates the access token sent as `Authorization: Bearer <token>`. Looks
// the user up fresh on every request (rather than trusting the token's
// payload) so a role/org change or deactivation takes effect immediately,
// not only after the token expires.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env['JWT_ACCESS_SECRET']!,
        });
    }

    async validate(payload: JwtPayload) {
        const user = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: { role: true },
        });

        if (!user || !user.isActive) {
            throw new UnauthorizedException('Invalid or expired session');
        }

        const { passwordHash: _passwordHash, ...safeUser } = user;
        return safeUser; // becomes req.user
    }
}
