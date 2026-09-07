import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamStagesService } from './exam-stages.service';
import { ExamStagesController } from './exam-stages.controller';
import { ExamStage } from './entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

// ExamPost is in forFeature for assertExamPostExists: a stage may only hang
// off a live post, on create and on reparent. No child entity here - a stage
// is the leaf of the hierarchy until exam_syllabi is built.
//
// Entities only, never the sibling modules, so the hierarchy stays free of
// circular imports.
@Module({
  imports: [TypeOrmModule.forFeature([ExamStage, ExamPost])],
  controllers: [ExamStagesController],
  providers: [ExamStagesService],
  exports: [ExamStagesService],
})
export class ExamStagesModule {}
