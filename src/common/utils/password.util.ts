import bcrypt from 'bcrypt';

const SALT_ROUDS = 12;

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUDS);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}