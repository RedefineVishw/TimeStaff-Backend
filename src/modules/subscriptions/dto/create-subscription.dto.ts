import { IsUUID } from 'class-validator';

export class CreateSubscriptionDto {
    @IsUUID('4', { message: 'A valid planId is required' })
    planId!: string;
}
