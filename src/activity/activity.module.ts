import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ActivityService } from './activity.service';
import { ActivityInterceptor } from './activity.interceptor';
import { UserActivity } from './entities/user-activity.entity';

/**
 * Presence tracking: which users were active on which day.
 *
 * Deliberately has no controller. The read side is exposed as a service so
 * the dashboard can call it (GET /dashboard/dau belongs to the dashboard
 * module, not here), and the write side is an interceptor rather than an
 * endpoint.
 *
 * ConfigModule is imported explicitly because ConfigModule.forRoot() in
 * AppModule is not registered as global.
 */
@Module({
  imports: [TypeOrmModule.forFeature([UserActivity]), ConfigModule],
  providers: [ActivityService, ActivityInterceptor],
  exports: [ActivityService, ActivityInterceptor],
})
export class ActivityModule {}
