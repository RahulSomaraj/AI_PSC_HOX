import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamSyllabiService } from './exam-syllabi.service';
import { ExamSyllabiController } from './exam-syllabi.controller';
import { ExamSyllabus } from './entities/exam-syllabus.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { ExamSyllabusItem } from '../exam-syllabus-items/entities/exam-syllabus-item.entity';

// Three entities, one for each direction this service reaches:
//   ExamSyllabus     - its own rows
//   ExamStage        - the parent, for assertStageAndPost on create and move
//   ExamSyllabusItem - the children, for the guard in remove()
//
// Entities only, never the sibling modules: ExamStagesModule holds
// ExamSyllabus for its own guard, and ExamSyllabusItemsModule holds
// ExamSyllabus for its parent check, so importing modules here would close
// two cycles at once.
@Module({
  imports: [
    TypeOrmModule.forFeature([ExamSyllabus, ExamStage, ExamSyllabusItem]),
  ],
  controllers: [ExamSyllabiController],
  providers: [ExamSyllabiService],
  exports: [ExamSyllabiService],
})
export class ExamSyllabiModule {}
