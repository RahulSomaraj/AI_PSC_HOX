import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtopicsService } from './subtopics.service';
import { SubtopicsController } from './subtopics.controller';
import { Subtopic } from './entities/subtopic.entity';
import { Topic } from '../topics/entities/topic.entity';
<<<<<<< HEAD
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subtopic, Topic, ExamSyllabusItem])],
=======
import { Question } from '../questions/entities/question.entity';

@Module({
  // Question is in forFeature for the guard in remove(): a subtopic cannot be
  // soft-deleted while questions are still tagged to it. QuestionsModule
  // holds Subtopic for assertTaxonomy - entities both ways, modules neither.
  imports: [TypeOrmModule.forFeature([Subtopic, Topic, Question])],
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  controllers: [SubtopicsController],
  providers: [SubtopicsService],
  exports: [SubtopicsService],
})
export class SubtopicsModule {}
