import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User } from '../users/entities/user.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Question } from '../questions/entities/question.entity';
import { Exam } from '../exam/entities/exam.entity';
import { ActivityModule } from '../activity/activity.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

/**
 * Read-only aggregates for the admin dashboard.
 *
 * A leaf module: nothing imports it, so pulling in ActivityModule and
 * SubscriptionsModule for their services cannot create a cycle. The other
 * four counts read entities directly - see the note on DashboardService's
 * constructor for why.
 *
 * ConfigModule is imported explicitly because ConfigModule.forRoot() in
 * AppModule is not registered as global.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([User, Batch, Question, Exam]),
    ActivityModule,
    SubscriptionsModule,
    ConfigModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
