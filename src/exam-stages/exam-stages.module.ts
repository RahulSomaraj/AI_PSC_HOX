import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamStagesService } from './exam-stages.service';
import { ExamStagesController } from './exam-stages.controller';
import { ExamStage } from './entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamSyllabus } from '../exam-syllabi/entities/exam-syllabus.entity';

// ExamPost is in forFeature for assertExamPostExists: a stage may only hang
// off a live post, on create and on reparent. ExamSyllabus is the child, for
// the guard in remove().
//
// Entities only, never the sibling modules: ExamSyllabiModule holds ExamStage
// for its own parent check, so importing modules here would close a cycle.
@Module({
  imports: [TypeOrmModule.forFeature([ExamStage, ExamPost, ExamSyllabus])],
  controllers: [ExamStagesController],
  providers: [ExamStagesService],
  exports: [ExamStagesService],
})
export class ExamStagesModule {}
