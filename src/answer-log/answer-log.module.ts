import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnswerLogService } from './answer-log.service';
import { AnswerLog } from './entities/answer-log.entity';
import { Question } from '../questions/entities/question.entity';
import { Exam } from '../exam/entities/exam.entity';

/**
 * One row per question answered, by anyone, ever - the grain the analytics
 * need and nothing else records.
 *
 * Deliberately has no controller, matching ActivityModule. Nothing posts an
 * answer here directly: the write side is called by ExamService.submit() and
 * QuestionsService.answerQuestion(), and the read side belongs to whichever
 * module owns the screen (GET /reports/... to the reports module, the
 * per-question breakdown to exam results).
 *
 * Three entities:
 *   AnswerLog - its own rows
 *   Question  - the taxonomy and correct answer, copied in at write time
 *   Exam      - the source the backfill rebuilds history from
 *
 * Entities only, never the sibling modules: ExamModule and QuestionsModule
 * both import this one for the write path, so importing them back would
 * close two cycles.
 */
@Module({
  imports: [TypeOrmModule.forFeature([AnswerLog, Question, Exam])],
  providers: [AnswerLogService],
  exports: [AnswerLogService],
})
export class AnswerLogModule {}
