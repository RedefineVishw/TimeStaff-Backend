import { BadRequestException, ConflictException, ForbiddenException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MailService } from '../../common/mail/mail.service.js';
import { CreateOrganizationDto } from './dto/create-organization.dto.js';
import { InviteUserDto } from './dto/invite-user.dto.js';
import { CreateQuoteRequestDto } from './dto/create-quote-request.dto.js';
import { CurrentUserPayload } from '../../common/types/current-user.type.js';
import { slugify, randomSlugSuffix } from '../../common/utils/slug.util.js';
import { generateVerificationToken, getTokenExpiry } from '../../common/utils/token.util.js';

// The role every organization creator is assigned as — must match the name
// bootstrap.ts seeds ("ORGANIZATION_ADMIN full access within their org").
const OWNER_ROLE_NAME = 'ORGANIZATION_ADMIN';

@Injectable()
export class OrganizationsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly mailService: MailService,
    ) { }

    async create(currentUser: CurrentUserPayload, dto: CreateOrganizationDto) {
        if (currentUser.organizationId) {
            throw new ConflictException('You already belong to an organization');
        }

        const ownerRole = await this.prisma.role.findUnique({ where: { name: OWNER_ROLE_NAME } });
        if (!ownerRole) {
            // Only possible if bootstrap.ts was never run against this database.
            throw new BadRequestException('Owner role is not configured — run the bootstrap script');
        }

        const slug = await this.generateUniqueSlug(dto.name);

        const organization = await this.prisma.organization.create({
            data: {
                name: dto.name,
                slug,
                ownerId: currentUser.id,
                createdBy: currentUser.id,
                updatedBy: currentUser.id,
            },
        });

        await this.prisma.user.update({
            where: { id: currentUser.id },
            data: {
                organizationId: organization.id,
                roleId: ownerRole.id,
                updatedBy: currentUser.id,
            },
        });

        return organization;
    }

    async invite(currentUser: CurrentUserPayload, organizationId: string, dto: InviteUserDto) {
        this.assertBelongsToOrg(currentUser, organizationId);

        const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
        if (!organization || organization.status !== 'ACTIVE') {
            throw new HttpException(
                'Activate a subscription before inviting team members',
                HttpStatus.PAYMENT_REQUIRED,
            );
        }

        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing) {
            throw new ConflictException('An account with this email already exists');
        }

        const role = await this.prisma.role.findUnique({ where: { id: dto.roleId } });
        if (!role) {
            throw new BadRequestException('roleId does not match any known role');
        }

        const verificationToken = generateVerificationToken();
        const verificationTokenExpiresAt = getTokenExpiry();

        // Invited users have passwordHash: null until accepted — this must
        // link to /accept-invite, not /verify-email (see MailService).
        await this.mailService.sendInviteEmail(dto.email, verificationToken);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                firstName: dto.firstName,
                lastName: dto.lastName,
                organizationId,
                roleId: dto.roleId,
                verificationToken,
                verificationTokenExpiresAt,
                createdBy: currentUser.id,
            },
        });

        return { id: user.id, email: user.email };
    }

    async createQuoteRequest(currentUser: CurrentUserPayload, organizationId: string, dto: CreateQuoteRequestDto) {
        this.assertBelongsToOrg(currentUser, organizationId);

        return this.prisma.quoteRequest.create({
            data: {
                organizationId,
                notes: dto.notes,
                contactPhone: dto.contactPhone,
                source: 'FORM',
            },
        });
    }

    private assertBelongsToOrg(currentUser: CurrentUserPayload, organizationId: string) {
        if (currentUser.organizationId !== organizationId) {
            throw new ForbiddenException('You do not have access to this organization');
        }
    }

    private async generateUniqueSlug(name: string): Promise<string> {
        const base = slugify(name) || 'organization';
        let slug = base;

        // Small bounded retry rather than an unbounded loop — a real
        // collision storm here would mean something else is wrong.
        for (let attempt = 0; attempt < 5; attempt++) {
            const existing = await this.prisma.organization.findUnique({ where: { slug } });
            if (!existing) {
                return slug;
            }
            slug = `${base}-${randomSlugSuffix()}`;
        }

        throw new BadRequestException('Could not generate a unique slug — try a different organization name');
    }
}
