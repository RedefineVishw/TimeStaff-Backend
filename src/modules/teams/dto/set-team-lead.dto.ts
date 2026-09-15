import { IsBoolean } from 'class-validator';

export class SetTeamLeadDto {
    @IsBoolean()
    isLead!: boolean;
}
