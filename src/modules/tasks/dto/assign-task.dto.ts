import { IsOptional, IsUUID } from 'class-validator';

export class AssignTaskDto {
    // Omit or null to unassign.
    @IsOptional()
    @IsUUID('4', { message: 'assigneeId must be a valid user id' })
    assigneeId?: string | null;
}
