import {
  Injectable,
  ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import type { UserPayload } from '../../common/interfaces/user-request.interface';

export const Public = () => SetMetadata('public', true);

interface JwtError {
  name?: string;
  message?: string;
}

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const isPublic = this.reflector.get<boolean>(
      'public',
      context.getHandler(),
    );

    if (isPublic) {
      return true;
    }

    return super.canActivate(context) as boolean | Promise<boolean>;
  }

  handleRequest<TUser = UserPayload>(
    err: unknown,
    user: TUser | false | null,
    info: unknown,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context?: ExecutionContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    status?: number,
  ): TUser {
    if (err) {
      console.error('JWT Error:', err);
    }
    if (!user) {
      const jwtInfo = info as JwtError | undefined;
      console.error('JWT Info:', jwtInfo);
      if (jwtInfo?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token expiré');
      }
      if (jwtInfo?.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Token invalide');
      }
      throw new UnauthorizedException('Token invalide ou manquant');
    }
    return user;
  }
}
