import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export enum TaskPriorityDto {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

export class CreateTaskDto {
    @IsString()
    @IsNotEmpty({ message: 'Task title is required' })
    title!: string;

    @IsOptional()
    @IsString()
    description?: string;

    // Omit for a top-level task; set to nest as a subtask (max 3 levels deep).
    @IsOptional()
    @IsUUID('4', { message: 'parentId must be a valid task id' })
    parentId?: string;

    @IsOptional()
    @IsEnum(TaskPriorityDto)
    priority?: TaskPriorityDto;

    @IsOptional()
    @IsUUID('4', { message: 'assigneeId must be a valid user id' })
    assigneeId?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    // 1 minute to 480 (8 hours, a full working day).
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(480, { message: 'estimatedMinutes cannot exceed 480 (8 hours)' })
    estimatedMinutes?: number;
}
