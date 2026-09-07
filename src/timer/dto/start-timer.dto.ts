import { IsNotEmpty, IsString } from 'class-validator';

export class StartTimerDto {
  @IsString()
  @IsNotEmpty()
  taskId!: string;
}
