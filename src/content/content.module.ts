import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { StudentContentController } from './student-content.controller';
import { StudentContentService } from './student-content.service';
import { Content } from './entities/content.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { ContentView } from '../content-views/entities/content-view.entity';
import { User } from '../users/entities/user.entity';
import { ContentViewsModule } from '../content-views/content-views.module';

/**
 * The study library: video, PDFs, notes and links, filed against the
 * academic taxonomy and optionally restricted to batches.
 *
 * Eight entities, of which one is its own. The rest are read-only here -
 * four to validate a taxonomy or exam-level tag, one to validate an attached
 * batch, the aspirant profile because that is where a student's batch lives,
 * and `ContentView` plus `User` for the Recently Viewed Content panel.
 * Entities rather than the sibling modules, following AnswerLogModule: this
 * needs tables, not services.
 *
 * Two controllers. `ContentController` owns `/content`;
 * `StudentContentController` owns `/users/:id/recent-content`, which sits on
 * the `users` base path without anyone editing `users.controller.ts` - see
 * CLAUDE.md §3.
 *
 * `ContentView` is registered here as well as in ContentViewsModule: that
 * module owns the *write*, this one owns the read behind the screen.
 *
 * Exported so `/faculty/:id/contributions` can count authored items without
 * going back out over HTTP.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Content,
      Batch,
      Subject,
      Topic,
      Subtopic,
      ExamLevel,
      AspirantProfile,
      ContentView,
      User,
    ]),

    // The write side of Reports -> Content Usage. findOne() records an open.
    ContentViewsModule,
  ],
  controllers: [ContentController, StudentContentController],
  providers: [ContentService, StudentContentService],
  exports: [ContentService],
})
export class ContentModule {}
