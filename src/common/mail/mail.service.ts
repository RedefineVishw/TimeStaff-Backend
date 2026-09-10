import { Injectable, OnModuleInit } from '@nestjs/common';
import nodemailer, { Transporter } from 'nodemailer';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class MailService implements OnModuleInit {
  private transporter!: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env['SMTP_HOST'],
      port: Number(process.env['SMTP_PORT'] ?? 587),
      secure: false, // 587 = STARTTLS (upgrades after connecting), not implicit TLS like 465
      auth: {
        user: process.env['SMTP_USER'],
        pass: process.env['SMTP_PASS'],
      },
    });
  }

  // Fails fast at startup if SMTP credentials are wrong, rather than only
  // discovering it the first time someone tries to register.
  async onModuleInit() {
    // Real sending is disabled for now (see sendVerificationEmail below), so
    // skip the SMTP handshake at boot too — no point failing startup over
    // credentials we aren't currently using.
    // await this.transporter.verify();
  }

  async sendVerificationEmail(to: string, token: string): Promise<void> {
    // The frontend route that consumes this token — adjust once that page exists.
    const verifyUrl = `${process.env['WEB_APP_URL'] ?? 'http://localhost:3000'}/verify-email?token=${token}`;

    // Real SMTP sending is commented out for now — email provider delivery
    // is unresolved (see chat history). Writing the link to a file instead
    // so registration can be tested end-to-end without a working provider.
    //
    // const info = await this.transporter.sendMail({
    //   from: process.env['SMTP_FROM'],
    //   to,
    //   subject: 'Verify your TimeStaff account',
    //   html: `
    //     <p>Welcome to TimeStaff — confirm your email to continue.</p>
    //     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
    //     <p>This link expires in 24 hours.</p>
    //   `,
    // });
    // console.log('[mail] sendMail result:', {
    //   messageId: info.messageId,
    //   accepted: info.accepted,
    //   rejected: info.rejected,
    //   response: info.response,
    // });

    await writeFile(
      join(process.cwd(), 'link.txt'),
      `To: ${to}\n${verifyUrl}\n`,
      'utf-8',
    );
    console.log(`[mail] Verification link written to link.txt for ${to}`);
  }
}
