import { IsOptional, IsUUID } from 'class-validator';

export class FindApprovalOverviewDto {
    // Narrows the overview to one submitter within the approver's scope —
    // the "select a particular person's requests" filter. Still re-checked
    // against the approver's actual scope server-side, not trusted blindly.
    @IsOptional()
    @IsUUID('4')
    userId?: string;
}
