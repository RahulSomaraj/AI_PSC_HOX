import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentAnalyticsService } from './student-analytics.service';
import { ExamResultsService } from './exam-results.service';
import { StudentPerformanceService } from './student-performance.service';
import { ExamAnalyticsService } from './exam-analytics.service';
import { GrowthEngagementService } from './growth-engagement.service';
import { ContentUsageService } from './content-usage.service';
import { StudentAnalyticsController } from './student-analytics.controller';
import { ExamResultsController } from './exam-results.controller';
import { ReportsController } from './reports.controller';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Exam } from '../exam/entities/exam.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ContentView } from '../content-views/entities/content-view.entity';

/**
 * Read-only analytics over the answer log.
 *
 * Holds entities rather than sibling modules, the same way AnswerLogModule
 * does: everything here is an aggregate query, none of it needs another
 * module's business logic, and UsersModule does not export its service
 * anyway. Subject is here for the name on each rollup row, User only to tell
 * an unknown student from one with no answers yet, and ContentView because
 * Content Usage reads it directly - ContentViewsModule exports only the
 * write side.
 *
 * Three controllers: the four Reports tabs on /reports, plus two that sit on
 * another module's base path - /users/:id/weak-subjects and
 * /exams/:id/results - so that neither UsersController nor ExamPostsController
 * has to be edited.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      AnswerLog,
      Subject,
      User,
      Exam,
      ExamPost,
      ContentView,
    ]),
    ConfigModule,
  ],
  controllers: [
    StudentAnalyticsController,
    ExamResultsController,
    ReportsController,
  ],
  providers: [
    StudentAnalyticsService,
    ExamResultsService,
    StudentPerformanceService,
    ExamAnalyticsService,
    GrowthEngagementService,
    ContentUsageService,
  ],
})
export class ReportsModule {}
