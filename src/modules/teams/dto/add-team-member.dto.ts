import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class AddTeamMemberDto {
    @IsUUID('4', { message: 'A valid userId is required' })
    userId!: string;

    @IsOptional()
    @IsBoolean()
    isLead?: boolean;
}
