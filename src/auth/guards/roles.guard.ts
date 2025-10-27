import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Request } from 'express';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const roles = request.user?.roles;

    if (!roles) {
      throw new ForbiddenException('Access denied. No roles found.');
    }

    const rolesArray = Array.isArray(roles) ? roles : [roles];
    const userRoles = rolesArray.map((r) => r.toString().toLowerCase());
    const needed = required.map((r) => r.toString().toLowerCase());

    const hasRole = needed.some((role) => userRoles.includes(role));
    if (!hasRole) {
      throw new ForbiddenException('Access denied. Insufficient permissions.');
    }

    return true;
  }
}
