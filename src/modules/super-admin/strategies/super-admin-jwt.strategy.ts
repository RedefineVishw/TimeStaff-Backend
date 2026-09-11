import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../../prisma/prisma.service.js';

interface SuperAdminJwtPayload {
    sub: string;
    email: string;
}

// A completely separate passport strategy from the org-user 'jwt' one —
// SuperAdmin is a fully separate table/concept outside the org/RBAC system,
// signed with its own secret so a leaked org-user token can never be used
// to authenticate as a Super Admin (and vice versa).
@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, 'super-admin-jwt') {
    constructor(private readonly prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: process.env['SUPER_ADMIN_JWT_SECRET']!,
        });
    }

    async validate(payload: SuperAdminJwtPayload) {
        const superAdmin = await this.prisma.superAdmin.findUnique({ where: { id: payload.sub } });
        if (!superAdmin) {
            throw new UnauthorizedException('Invalid or expired session');
        }

        const { passwordHash: _passwordHash, ...safeSuperAdmin } = superAdmin;
        return safeSuperAdmin; // becomes req.user
    }
}
