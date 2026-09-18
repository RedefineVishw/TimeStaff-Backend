import { IsIn, IsOptional } from 'class-validator';

export class FindTimeEntryRequestsDto {
    @IsOptional()
    @IsIn(['SUBMITTED', 'APPROVED', 'DENIED', 'CANCELLED'])
    status?: 'SUBMITTED' | 'APPROVED' | 'DENIED' | 'CANCELLED';
}
