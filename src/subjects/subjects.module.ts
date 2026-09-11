import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubjectsService } from './subjects.service';
import { SubjectsController } from './subjects.controller';
import { Subject } from './entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';
import { Question } from '../questions/entities/question.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, Topic, Subtopic, ExamSyllabusItem, Question]),
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
