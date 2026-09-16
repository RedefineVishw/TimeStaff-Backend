import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateTrackingSettingsDto {
    // 15s – 15min
    @IsOptional()
    @IsInt()
    @Min(15)
    @Max(900)
    idleThresholdSec?: number;

    // 5s – 15min
    @IsOptional()
    @IsInt()
    @Min(5)
    @Max(900)
    screenshotIntervalSec?: number;
}
