import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TopicsService } from './topics.service';
import { TopicsController } from './topics.controller';
import { Topic } from './entities/topic.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, Subject, Subtopic, ExamSyllabusItem]),
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
