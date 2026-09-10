import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ExamSyllabusItemsService } from './exam-syllabus-items.service';
import { ExamSyllabusItemsController } from './exam-syllabus-items.controller';
import { ExamSyllabusItem } from './entities/exam-syllabus-item.entity';
import { ExamSyllabus } from '../exam-syllabi/entities/exam-syllabus.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';

// Five entities, which is what a bridge table costs: it reaches into both
// hierarchies at once.
//   ExamSyllabusItem            - its own rows
//   ExamSyllabus                - the parent, for assertSyllabusExists
//   Subject, Topic, Subtopic    - the academic side, for assertTaxonomy
//
// The topic and subtopic lookups also read the linking column, so those are
// not merely existence checks.
//
// Entities only, never the sibling modules: ExamSyllabiModule holds
// ExamSyllabusItem for its own guard, and the three academic modules will
// hold it too once the follow-on pass adds their guards.
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExamSyllabusItem,
      ExamSyllabus,
      Subject,
      Topic,
      Subtopic,
    ]),
  ],
  controllers: [ExamSyllabusItemsController],
  providers: [ExamSyllabusItemsService],
  exports: [ExamSyllabusItemsService],
})
export class ExamSyllabusItemsModule {}
