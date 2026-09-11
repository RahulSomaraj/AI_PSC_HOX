import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QuestionsService } from './questions.service';
import { QuestionsController } from './questions.controller';
import { Question } from './entities/question.entity';
import { Course } from '../course/entities/course.entity';
import { User } from '../users/entities/user.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { AnswerLogModule } from '../answer-log/answer-log.module';

// Subject, Topic and Subtopic are in forFeature for assertTaxonomy: each tag
// must exist, must not be soft-deleted, and must belong to the one above it.
// The topic and subtopic lookups also read the linking column, so these are
// not merely existence checks.
//
// The three academic modules hold the Question entity for the mirror-image
// guard in their remove(). Entities both ways, modules neither way, so no
// cycle forms.
//
// AnswerLog is in forFeature for the guard in remove(): a question that has
// been answered cannot be hard-deleted. AnswerLogModule is imported for the
// write in answerQuestion() - the module rather than just the entity,
// because the service resolves the taxonomy before inserting.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Question,
      Course,
      User,
      Subject,
      Topic,
      Subtopic,
      AnswerLog,
    ]),
    AnswerLogModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
