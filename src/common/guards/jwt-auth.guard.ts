import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Applies the 'jwt' passport strategy (JwtStrategy) to a route — put this on
// any endpoint that requires a logged-in user.
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
