import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentAnalyticsService } from './student-analytics.service';
import { StudentAnalyticsController } from './student-analytics.controller';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';

/**
 * Read-only analytics over the answer log.
 *
 * Holds entities rather than sibling modules, the same way AnswerLogModule
 * does: everything here is an aggregate query, none of it needs another
 * module's business logic, and UsersModule does not export its service
 * anyway. Subject is here for the name on each rollup row, User only to tell
 * an unknown student from one with no answers yet.
 *
 * The four Reports tabs land here next and will add their own controller.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AnswerLog, Subject, User])],
  controllers: [StudentAnalyticsController],
  providers: [StudentAnalyticsService],
})
export class ReportsModule {}
