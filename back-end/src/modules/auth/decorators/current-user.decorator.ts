import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { Request } from 'express';

import type { AuthenticatedUser } from '@modules/auth/strategies/jwt.strategy';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser;
  },
);
