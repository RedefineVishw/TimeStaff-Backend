import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Pulls req.user (set by JwtStrategy.validate) into a controller param —
// use as @CurrentUser() user: instead of reaching into @Req() everywhere.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
