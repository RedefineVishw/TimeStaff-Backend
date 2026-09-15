import { IsUUID } from 'class-validator';

export class AddProjectMemberDto {
    @IsUUID('4', { message: 'A valid userId is required' })
    userId!: string;

    @IsUUID('4', { message: 'A valid roleId is required' })
    roleId!: string;
}
