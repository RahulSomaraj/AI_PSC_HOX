import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SyllabusService } from './syllabus.service';
import { SyllabusController } from './syllabus.controller';
import { ExamSyllabus } from './entities/exam-syllabus.entity';
import { ExamSyllabusItem } from './entities/exam-syllabus-item.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamSyllabus,
      ExamSyllabusItem,
      ExamPost,
      ExamStage,
      Subject,
      Topic,
      Subtopic,
    ]),
  ],
  controllers: [SyllabusController],
  providers: [SyllabusService],
  exports: [SyllabusService],
})
export class SyllabusModule {}
