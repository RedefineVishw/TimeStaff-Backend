import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { TaskPriorityDto } from './create-task.dto.js';

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty({ message: 'Task title cannot be empty' })
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskPriorityDto)
    priority?: TaskPriorityDto;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(480, { message: 'estimatedMinutes cannot exceed 480 (8 hours)' })
    estimatedMinutes?: number;
}
