import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { Content } from './entities/content.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';

/**
 * The study library: notes, lecture video and documents, filed against the
 * academic taxonomy and optionally restricted to batches.
 *
 * Six entities, of which one is its own. The other five are all read-only
 * here - three to validate a taxonomy tag, one to validate an attached
 * batch, and the aspirant profile because that is where a student's batch
 * lives. Entities rather than the sibling modules, following
 * AnswerLogModule: this needs tables, not services.
 *
 * Exported so `/faculty/:id/contributions` and `/users/:id/recent-content`
 * can read the library without going back out over HTTP.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Content,
      Batch,
      Subject,
      Topic,
      Subtopic,
      AspirantProfile,
    ]),
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
