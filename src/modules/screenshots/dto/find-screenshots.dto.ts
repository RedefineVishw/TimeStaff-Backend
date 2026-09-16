import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class FindScreenshotsDto {
    // A single calendar day, "yyyy-mm-dd" — matches one day's worth of
    // captures rather than an open-ended range, since the gallery is
    // browsed one day at a time (see the frontend's day navigator).
    @IsOptional()
    @IsDateString()
    date?: string;

    // Narrow to one person's screenshots — still checked against the
    // caller's visibility scope in the service, not trusted blindly.
    @IsOptional()
    @IsUUID('4')
    userId?: string;
}
