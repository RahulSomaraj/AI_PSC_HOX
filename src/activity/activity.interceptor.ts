import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import type { Request } from 'express';
import { ActivityService } from './activity.service';

/**
 * Records that the authenticated caller was active today.
 *
 * Registered globally through APP_INTERCEPTOR in AppModule rather than
 * app.useGlobalInterceptors() in main.ts, because the interceptors there are
 * wrapped in an `if (NODE_ENV !== 'production')` and activity tracking is
 * wanted precisely in production.
 *
 * Interceptors run after guards, so request.user is already populated by
 * JwtAuthGuard by the time this executes. Unauthenticated and public routes
 * carry no user and are skipped, which is the behaviour we want - an
 * anonymous request is not a user being active.
 *
 * The call is fire-and-forget inside ActivityService; nothing here awaits a
 * write or can fail the request.
 */
@Injectable()
export class ActivityInterceptor implements NestInterceptor {
  constructor(private readonly activityService: ActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userId = request.user?.userId;

    if (typeof userId === 'number') {
      this.activityService.recordActivity(userId);
    }

    return next.handle();
  }
}
