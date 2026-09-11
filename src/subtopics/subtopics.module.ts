import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubtopicsService } from './subtopics.service';
import { SubtopicsController } from './subtopics.controller';
import { Subtopic } from './entities/subtopic.entity';
import { Topic } from '../topics/entities/topic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';
import { Question } from '../questions/entities/question.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Subtopic, Topic, ExamSyllabusItem, Question])],
  controllers: [SubtopicsController],
  providers: [SubtopicsService],
  exports: [SubtopicsService],
})
export class SubtopicsModule {}
