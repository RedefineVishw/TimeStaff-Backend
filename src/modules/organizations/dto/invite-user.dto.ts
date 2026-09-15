import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// No roleId — an invited user gets org membership only, no role, no project
// access until an admin/PM explicitly adds them to a specific project with
// a specific role there (ProjectMember). Only org-wide roles (currently
// none are assigned at invite time) would ever belong on User.roleId.
export class InviteUserDto {
    @IsEmail({}, { message: 'Enter a valid email address' })
    email!: string;

    @IsString()
    @IsNotEmpty({ message: 'First name is required' })
    firstName!: string;

    @IsString()
    @IsNotEmpty({ message: 'Last name is required' })
    lastName!: string;
}
