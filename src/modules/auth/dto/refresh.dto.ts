import { IsOptional, IsString } from 'class-validator';

// Only used as a fallback when no refreshToken cookie is present — the
// desktop client, which has no cookie jar, sends its stored refresh token
// here instead. The web client never needs to set this; its cookie wins.
export class RefreshDto {
    @IsOptional()
    @IsString()
    refreshToken?: string;
}
