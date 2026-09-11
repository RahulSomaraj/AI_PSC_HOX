import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, IsNull, MoreThan, Not, Repository } from 'typeorm';
import { AnswerLog } from './entities/answer-log.entity';
import { Question } from '../questions/entities/question.entity';
import { Exam } from '../exam/entities/exam.entity';

/** What a question contributes to a log row, resolved at write time. */
interface QuestionFacts {
  subjectId: number | null;
  topicId: number | null;
  subtopicId: number | null;
  correctAnswer: string;
}

/** One answer, as the caller already knows it. */
export interface RecordedAnswer {
  questionId: number;
  selectedAnswer: string;
  isCorrect: boolean;
  timeTakenSec?: number | null;
}

export interface BackfillSummary {
  examsScanned: number;
  rowsInserted: number;
  questionsMissing: number;
}

@Injectable()
export class AnswerLogService {
  private readonly logger = new Logger(AnswerLogService.name);

  constructor(
    @InjectRepository(AnswerLog)
    private readonly answerLogRepository: Repository<AnswerLog>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  /**
   * The taxonomy and correct answer for a set of questions.
   *
   * Read straight from the questions table rather than through
   * QuestionsService.getBulkQuestions, which does not return subjectId,
   * topicId or subtopicId - and which is an admin-facing shape this log has
   * no business widening.
   *
   * A question id absent from the result no longer exists. Callers must skip
   * it: question_id is RESTRICT, so inserting a row for a deleted question
   * fails the whole statement.
   */
  private async loadQuestionFacts(
    questionIds: number[],
    manager?: EntityManager,
  ): Promise<Map<number, QuestionFacts>> {
    if (questionIds.length === 0) return new Map();

    const repo = manager
      ? manager.getRepository(Question)
      : this.questionRepository;

    const questions = await repo.find({
      where: { id: In(questionIds) },
      select: {
        id: true,
        subjectId: true,
        topicId: true,
        subtopicId: true,
        correctAnswer: true,
      },
    });

    return new Map(
      questions.map((q) => [
        q.id,
        {
          subjectId: q.subjectId,
          topicId: q.topicId,
          subtopicId: q.subtopicId,
          correctAnswer: q.correctAnswer,
        },
      ]),
    );
  }

  /**
   * Inserts rows, ignoring any that collide with the partial unique index on
   * (exam_id, question_id).
   *
   * orIgnore is what makes a resubmission and the backfill safe to repeat:
   * the second write of the same answer is a no-op rather than a duplicate
   * or an error. Practice rows have a null exam_id and so fall outside the
   * index entirely - they always insert.
   */
  private async insertRows(
    rows: Partial<AnswerLog>[],
    manager?: EntityManager,
  ): Promise<number> {
    if (rows.length === 0) return 0;

    const repo = manager
      ? manager.getRepository(AnswerLog)
      : this.answerLogRepository;

    const result = await repo
      .createQueryBuilder()
      .insert()
      .into(AnswerLog)
      .values(rows)
      .orIgnore()
      .execute();

    // identifiers holds one entry per row actually written; a row skipped by
    // orIgnore contributes an empty one.
    return result.identifiers.filter((identifier) => identifier).length;
  }

  /**
   * Records every answer of a submitted exam.
   *
   * `manager` is passed by ExamService.submit so the rows and the completed
   * exam commit together - either the attempt is finished and logged, or
   * neither happened and the student can resubmit.
   *
   * Unanswered questions are recorded too, with an empty selectedAnswer and
   * isCorrect false, matching how submit() already scores them. The blank is
   * what separates skipped from wrong, so a report wanting accuracy over
   * attempted questions only can exclude `selected_answer = ''`.
   */
  async recordExamAnswers(
    params: { userId: number; examId: number; answers: RecordedAnswer[] },
    manager?: EntityManager,
  ): Promise<number> {
    const facts = await this.loadQuestionFacts(
      params.answers.map((answer) => answer.questionId),
      manager,
    );

    const rows = params.answers
      .filter((answer) => facts.has(answer.questionId))
      .map((answer) => {
        const fact = facts.get(answer.questionId)!;
        return {
          userId: params.userId,
          questionId: answer.questionId,
          examId: params.examId,
          subjectId: fact.subjectId,
          topicId: fact.topicId,
          subtopicId: fact.subtopicId,
          selectedAnswer: answer.selectedAnswer,
          isCorrect: answer.isCorrect,
          timeTakenSec: answer.timeTakenSec ?? null,
        };
      });

    return await this.insertRows(rows, manager);
  }

  /**
   * Records a single practice answer - exam_id null, no uniqueness, since
   * answering the same question again is the point of practice.
   */
  async recordPracticeAnswer(params: {
    userId: number;
    questionId: number;
    selectedAnswer: string;
    isCorrect: boolean;
    timeTakenSec?: number | null;
  }): Promise<number> {
    const facts = await this.loadQuestionFacts([params.questionId]);
    const fact = facts.get(params.questionId);
    if (!fact) return 0;

    return await this.insertRows([
      {
        userId: params.userId,
        questionId: params.questionId,
        examId: null,
        subjectId: fact.subjectId,
        topicId: fact.topicId,
        subtopicId: fact.subtopicId,
        selectedAnswer: params.selectedAnswer,
        isCorrect: params.isCorrect,
        timeTakenSec: params.timeTakenSec ?? null,
      },
    ]);
  }

  /**
   * Rebuilds the log from the answers already stored on completed exams, so
   * Reports ships with history rather than starting empty.
   *
   * Safe to re-run and safe to interrupt: every insert is orIgnore against
   * the (exam_id, question_id) index, so a second pass writes only what the
   * first missed.
   *
   * Two things it cannot recover, both recorded on the entity:
   *   - Timing. exams.answers holds no per-question duration, so
   *     time_taken_sec is null for every backfilled row.
   *   - The original instant. answered_at is the insert time; order across
   *     the backfill boundary by exams.completedAt instead.
   *
   * And one it recovers only approximately: correctness is recomputed
   * against each question's *current* correctAnswer. A question edited since
   * the attempt will be scored by today's answer, which may disagree with
   * the score stored on the exam row.
   */
  async backfillFromExams(
    options: { batchSize?: number } = {},
  ): Promise<BackfillSummary> {
    const batchSize = options.batchSize ?? 100;
    const summary: BackfillSummary = {
      examsScanned: 0,
      rowsInserted: 0,
      questionsMissing: 0,
    };

    // Keyset pagination rather than skip/take: the table is being written to
    // while this runs, and an OFFSET would drift.
    let lastId = 0;

    for (;;) {
      const exams = await this.examRepository.find({
        where: {
          id: MoreThan(lastId),
          status: 'completed',
          completedAt: Not(IsNull()),
        },
        order: { id: 'ASC' },
        take: batchSize,
        select: {
          id: true,
          userId: true,
          questionIds: true,
          answers: true,
        },
      });

      if (exams.length === 0) break;
      lastId = exams[exams.length - 1].id;

      // One lookup per batch rather than per exam: attempts on the same
      // course draw from the same question pool, so the overlap is large.
      const questionIds = [
        ...new Set(exams.flatMap((exam) => exam.questionIds ?? [])),
      ];
      const facts = await this.loadQuestionFacts(questionIds);

      const rows: Partial<AnswerLog>[] = [];

      for (const exam of exams) {
        summary.examsScanned++;

        for (const questionId of exam.questionIds ?? []) {
          const fact = facts.get(questionId);
          if (!fact) {
            // Hard-deleted since the attempt. RESTRICT would reject the row
            // and take the whole batch with it.
            summary.questionsMissing++;
            continue;
          }

          // submit() writes this map with either numeric or string keys
          // depending on the client, and reads it back the same way.
          const selectedAnswer =
            exam.answers?.[questionId] ??
            exam.answers?.[String(questionId)] ??
            '';

          rows.push({
            userId: exam.userId,
            questionId,
            examId: exam.id,
            subjectId: fact.subjectId,
            topicId: fact.topicId,
            subtopicId: fact.subtopicId,
            selectedAnswer,
            isCorrect: selectedAnswer === fact.correctAnswer,
            timeTakenSec: null,
          });
        }
      }

      summary.rowsInserted += await this.insertRows(rows);

      this.logger.log(
        `Backfill: ${summary.examsScanned} exams scanned, ${summary.rowsInserted} rows inserted`,
      );

      if (exams.length < batchSize) break;
    }

    if (summary.questionsMissing > 0) {
      this.logger.warn(
        `Backfill skipped ${summary.questionsMissing} answers whose question no longer exists`,
      );
    }

    return summary;
  }
}
