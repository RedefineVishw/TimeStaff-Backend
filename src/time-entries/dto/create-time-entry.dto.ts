import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateTimeEntryDto {
  @IsString()
  @IsNotEmpty()
  taskId!: string;

  @IsDateString()
  startedAt!: string;

  @IsDateString()
  endedAt!: string;
}
