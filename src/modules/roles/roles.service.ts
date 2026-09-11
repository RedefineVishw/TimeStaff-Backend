import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class RolesService {
    constructor(private readonly prisma: PrismaService) { }

    // Backs the invite form's role picker — any logged-in org member can see
    // the list of assignable roles, no special permission needed for that.
    findAll() {
        return this.prisma.role.findMany({
            select: { id: true, name: true, description: true },
            orderBy: { name: 'asc' },
        });
    }
}
