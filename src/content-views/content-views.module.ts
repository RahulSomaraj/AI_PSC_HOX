import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentViewsService } from './content-views.service';
import { ContentView } from './entities/content-view.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';

/**
 * One row per content open - the grain Reports -> Content Usage needs and
 * nothing else records.
 *
 * Deliberately has no controller, matching ActivityModule and
 * AnswerLogModule. Nothing posts a view here directly: the write side is
 * called by ContentService.findOne(), and the read side belongs to whichever
 * module owns the screen - Content Usage to the reports module, Recently
 * Viewed Content to `GET /users/:id/recent-content`.
 *
 * Entities only, never the sibling modules: ContentModule imports this one
 * for the write path, so importing it back would close the cycle. That is
 * also why the service types its arguments structurally rather than
 * importing `Content`.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ContentView, AspirantProfile])],
  providers: [ContentViewsService],
  exports: [ContentViewsService],
})
export class ContentViewsModule {}
