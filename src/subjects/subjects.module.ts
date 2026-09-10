import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { Subject } from './entities/subject.entity';
<<<<<<< HEAD
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, Topic, Subtopic, ExamSyllabusItem]),
  ],
=======
import { Question } from '../questions/entities/question.entity';

@Module({
  // Question is in forFeature for the guard in remove(): a subject cannot be
  // soft-deleted while questions are still tagged to it. QuestionsModule
  // holds Subject for assertTaxonomy - entities both ways, modules neither.
  imports: [TypeOrmModule.forFeature([Subject, Question])],
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
