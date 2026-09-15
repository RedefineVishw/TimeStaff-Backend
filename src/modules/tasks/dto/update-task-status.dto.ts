import { IsEnum } from 'class-validator';

export enum TaskStatusDto {
    TODO = 'TODO',
    IN_PROGRESS = 'IN_PROGRESS',
    IN_REVIEW = 'IN_REVIEW',
    DONE = 'DONE',
}

export class UpdateTaskStatusDto {
    @IsEnum(TaskStatusDto)
    status!: TaskStatusDto;
}
