// src/auth/guards/jwt.auth.guard.ts
import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { ExtractJwt } from 'passport-jwt';
import { DataSource } from 'typeorm';
import { RevokedToken } from '../entities/revoked-token.entity';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private readonly dataSource: DataSource,
    private readonly reflector: Reflector,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>('isPublic', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const req = context.switchToHttp().getRequest();

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException('Missing Bearer token');
    }

    // Lazy-resolve repo from the active DataSource
    const revokedTokenRepo = this.dataSource.getRepository(RevokedToken);

    const revoked = await revokedTokenRepo.findOne({
      where: { token },
      select: { id: true },
    });
    if (revoked) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return (await super.canActivate(context)) as boolean;
  }
}
