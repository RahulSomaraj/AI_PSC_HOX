import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { Topic } from './entities/topic.entity';
import { Subject } from '../subjects/entities/subject.entity';
<<<<<<< HEAD
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, Subject, Subtopic, ExamSyllabusItem]),
  ],
=======
import { Question } from '../questions/entities/question.entity';

@Module({
  // Question is in forFeature for the guard in remove(): a topic cannot be
  // soft-deleted while questions are still tagged to it. QuestionsModule
  // holds Topic for assertTaxonomy - entities both ways, modules neither.
  imports: [TypeOrmModule.forFeature([Topic, Subject, Question])],
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
