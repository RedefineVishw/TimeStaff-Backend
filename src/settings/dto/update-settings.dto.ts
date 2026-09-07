import { IsInt, Max, Min } from 'class-validator';

export class UpdateSettingsDto {
  @IsInt()
  @Min(1)
  @Max(10)
  idleTimeoutMinutes!: number;
}
