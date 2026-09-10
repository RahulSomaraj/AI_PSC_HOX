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

// Subject, Topic and Subtopic are in forFeature for assertTaxonomy: each tag
// must exist, must not be soft-deleted, and must belong to the one above it.
// The topic and subtopic lookups also read the linking column, so these are
// not merely existence checks.
//
// The three academic modules hold the Question entity for the mirror-image
// guard in their remove(). Entities both ways, modules neither way, so no
// cycle forms.
@Module({
  imports: [
    TypeOrmModule.forFeature([Question, Course, User, Subject, Topic, Subtopic]),
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
