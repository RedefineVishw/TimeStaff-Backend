import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { hashPassword } from '../../common/utils/password.util.js';
import { generateVerificationToken, getTokenExpiry } from '../../common/utils/token.util.js';
import { MailService } from '../../common/mail/mail.service.js';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService, private readonly mailService: MailService) { }

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
}