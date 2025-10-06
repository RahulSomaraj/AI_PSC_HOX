import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  user?: {
    roles?: Role | string | (Role | string)[];
  };
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles are required, allow access
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || user.roles == null) {
      throw new ForbiddenException('Access denied. No roles found.');
    }

    // Normalize roles to an array
    const rolesArray: (Role | string)[] = Array.isArray(user.roles)
      ? user.roles
      : [user.roles];

    if (rolesArray.length === 0) {
      throw new ForbiddenException('Access denied. No roles found.');
    }

    // Compare as lowercase strings
    const userRoles = rolesArray.map((r) => r.toString().toLowerCase());
    const needed = required.map((r) => r.toString().toLowerCase());

    const hasRole = needed.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    return true;
  }
}
