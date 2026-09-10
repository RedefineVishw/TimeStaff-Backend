import { Controller, Get } from '@nestjs/common';
import { PlansService } from './plans.service.js';
import { SuccessMessage } from '../../common/decorators/success-message.decorator.js';

// No JwtAuthGuard here deliberately — the plan-selection screen needs to be
// visible before the user has even created an organization, let alone
// activated a subscription.
@Controller('plans')
export class PlansController {
    constructor(private readonly plansService: PlansService) { }

    @Get()
    @SuccessMessage('Plans retrieved.')
    findPublicPlans() {
        return this.plansService.findPublicPlans();
    }
}
