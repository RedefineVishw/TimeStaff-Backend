import { IsIn, IsOptional } from 'class-validator';

export class FindTimeEntryRequestsDto {
    @IsOptional()
    @IsIn(['SUBMITTED', 'APPROVED', 'DENIED'])
    status?: 'SUBMITTED' | 'APPROVED' | 'DENIED';
}
