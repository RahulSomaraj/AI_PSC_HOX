import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamStagesService } from './exam-stages.service';
import { ExamStagesController } from './exam-stages.controller';
import { ExamStage } from './entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamSyllabus } from '../syllabus/entities/exam-syllabus.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ExamStage, ExamPost, ExamSyllabus])],
  controllers: [ExamStagesController],
  providers: [ExamStagesService],
  exports: [ExamStagesService],
})
export class ExamStagesModule {}
