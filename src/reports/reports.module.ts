import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentAnalyticsService } from './student-analytics.service';
import { ExamResultsService } from './exam-results.service';
import { StudentPerformanceService } from './student-performance.service';
import { StudentAnalyticsController } from './student-analytics.controller';
import { ExamResultsController } from './exam-results.controller';
import { ReportsController } from './reports.controller';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Exam } from '../exam/entities/exam.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

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
  imports: [
    TypeOrmModule.forFeature([AnswerLog, Subject, User, Exam, ExamPost]),
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
  ],
})
export class ReportsModule {}
