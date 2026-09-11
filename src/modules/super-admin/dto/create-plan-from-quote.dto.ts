import { Type } from 'class-transformer';
import {
    IsArray,
    IsIn,
    IsNotEmpty,
    IsNumberString,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';

class PlanEntitlementInput {
    @IsString()
    @IsNotEmpty()
    feature!: string;

    @IsString()
    @IsNotEmpty()
    value!: string;
}

export class CreatePlanFromQuoteDto {
    @IsString()
    @IsNotEmpty({ message: 'Plan name is required' })
    name!: string;

    // Decimal(10,2) column — kept as a numeric string rather than `number`
    // to avoid floating-point rounding on money values.
    @IsNumberString({}, { message: 'basePrice must be a numeric string, e.g. "499.00"' })
    basePrice!: string;

    @IsIn(['MONTHLY', 'YEARLY'], { message: 'billingCycle must be MONTHLY or YEARLY' })
    billingCycle!: 'MONTHLY' | 'YEARLY';

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PlanEntitlementInput)
    entitlements?: PlanEntitlementInput[];
}
