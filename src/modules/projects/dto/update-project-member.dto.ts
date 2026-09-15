import { IsUUID } from 'class-validator';

export class UpdateProjectMemberDto {
    @IsUUID('4', { message: 'A valid roleId is required' })
    roleId!: string;
}
