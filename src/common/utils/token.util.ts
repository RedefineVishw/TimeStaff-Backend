import { randomBytes } from 'node:crypto';

export function generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
}

export function getTokenExpiry(hours = 24): Date {
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}