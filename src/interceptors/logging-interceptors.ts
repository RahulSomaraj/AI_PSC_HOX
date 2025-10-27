import {
  CallHandler,
  ExecutionContext,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

export class LoggingInterceptor implements NestInterceptor {
  private logger = new Logger('API');

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const url = req.url;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const getStatusColor = (ms: number): string => {
          if (ms < 200) {
            return '\x1b[32m';
          }
          if (ms < 500) return '\x1b[33m';
          return '\x1b[31m';
        };

        const reset = '\x1b[0m';
        const methodColor = '\x1b[36m';
        const urlColor = '\x1b[34m';
        const timeColor = getStatusColor(duration);
        this.logger.log(
          `${methodColor}${method} ${reset} ${urlColor}${url}${reset} - ${timeColor}${duration}ms${reset}`,
        );
      }),
    );
  }
}
