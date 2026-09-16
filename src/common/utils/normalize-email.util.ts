import { Transform } from 'class-transformer';

// Emails are case-insensitive per RFC 5321 in practice (and every mail
// provider treats them that way) — "Vishw@x.com" and "vishw@x.com" must
// resolve to the same account. Every DTO that carries an email used for
// lookup or storage should use this so `findUnique({ where: { email } })`
// and uniqueness checks can't be bypassed by changing case.
export function NormalizeEmail() {
    return Transform(({ value }: { value: unknown }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    );
}
