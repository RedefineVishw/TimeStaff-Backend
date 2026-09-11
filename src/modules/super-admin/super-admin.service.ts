import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto.js';
import { CreatePlanFromQuoteDto } from './dto/create-plan-from-quote.dto.js';
import { comparePasswords } from '../../common/utils/password.util.js';

@Injectable()
export class SuperAdminService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    async login(dto: SuperAdminLoginDto) {
        const superAdmin = await this.prisma.superAdmin.findUnique({ where: { email: dto.email } });

        // Same message whether the email doesn't exist or the password is
        // wrong — don't leak which emails are Super Admins.
        if (!superAdmin || !(await comparePasswords(dto.password, superAdmin.passwordHash))) {
            throw new UnauthorizedException('Invalid email or password');
        }

        const accessToken = await this.jwtService.signAsync(
            { sub: superAdmin.id, email: superAdmin.email },
            {
                secret: process.env['SUPER_ADMIN_JWT_SECRET'],
                expiresIn: (process.env['SUPER_ADMIN_JWT_EXPIRY'] ?? '1h') as unknown as number,
            },
        );

        return {
            accessToken,
            superAdmin: {
                id: superAdmin.id,
                email: superAdmin.email,
                firstName: superAdmin.firstName,
                lastName: superAdmin.lastName,
            },
        };
    }

    // Pending-by-default so the dashboard's "needs attention" view doesn't
    // require an explicit filter — pass ?status= to see others.
    findQuoteRequests(status?: 'PENDING' | 'CONTACTED' | 'RESOLVED') {
        return this.prisma.quoteRequest.findMany({
            where: { status: status ?? 'PENDING' },
            include: { organization: { select: { id: true, name: true, slug: true, status: true } } },
            orderBy: { createdAt: 'asc' },
        });
    }

    // The one action Phase 1 actually needs from Super Admin: turn a
    // negotiated QuoteRequest into a CUSTOM Plan scoped to that org, so the
    // org can then activate it via POST /subscriptions like any public plan.
    async convertQuoteToPlan(quoteRequestId: string, dto: CreatePlanFromQuoteDto) {
        const quoteRequest = await this.prisma.quoteRequest.findUnique({ where: { id: quoteRequestId } });
        if (!quoteRequest) {
            throw new NotFoundException('Quote request not found');
        }

        if (quoteRequest.status === 'RESOLVED') {
            throw new BadRequestException('This quote request has already been resolved');
        }

        let plan;
        try {
            plan = await this.prisma.plan.create({
                data: {
                    name: dto.name,
                    basePrice: dto.basePrice,
                    billingCycle: dto.billingCycle,
                    visibility: 'CUSTOM',
                    organizationId: quoteRequest.organizationId,
                    entitlements: dto.entitlements
                        ? { create: dto.entitlements.map((e) => ({ feature: e.feature, value: e.value })) }
                        : undefined,
                },
                include: { entitlements: true },
            });
        } catch (err) {
            // Plan.name is globally unique — a collision is a real
            // possibility here since the admin picks the name by hand.
            if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
                throw new ConflictException('A plan with this name already exists — choose a different name');
            }
            throw err;
        }

        await this.prisma.quoteRequest.update({
            where: { id: quoteRequestId },
            data: { status: 'RESOLVED' },
        });

        return plan;
    }
}
