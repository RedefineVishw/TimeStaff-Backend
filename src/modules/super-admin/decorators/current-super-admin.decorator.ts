import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Pulls req.user (set by SuperAdminJwtStrategy.validate) into a controller
// param — mirrors CurrentUser, kept separate since the payload shape and
// auth path are entirely different from org-user auth.
export const CurrentSuperAdmin = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
