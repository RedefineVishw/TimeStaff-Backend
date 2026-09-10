// Shape of req.user, set by JwtStrategy.validate() — the full Prisma User
// row minus passwordHash, with its role relation included.
export interface CurrentUserPayload {
    id: string;
    email: string;
    organizationId: string | null;
    roleId: string | null;
    emailVerified: boolean;
    isActive: boolean;
    role: { id: string; name: string } | null;
}
