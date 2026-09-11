import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Exam } from '../exam/entities/exam.entity';
import {
  ExamAnalyticsDto,
  ExamAnalyticsRowDto,
  ExamAnalyticsSummaryDto,
} from './dto/exam-analytics.dto';
import { ExamAnalyticsQueryDto } from './dto/exam-analytics-query.dto';

interface SummaryRow {
  totalAttempts: string;
  completed: string;
  averageScore: string | null;
  distinctStudents: string;
}

interface AnalyticsRow {
  courseId: number;
  courseName: string;
  attempts: string;
  completed: string;
  distinctStudents: string;
  averageScore: string | null;
  highestScore: string | null;
  lowestScore: string | null;
  attempted: string;
  correct: string;
  lastAttemptAt: Date | null;
}

/** score as a fraction of the total, guarded against a missing total. */
const RATIO = 'exam."score"::float / NULLIF(exam."totalPossibleScore", 0)';
const COMPLETED = `exam."status" = 'completed'`;

/**
 * Accuracy comes from a subquery rather than a join to answer_log.
 *
 * Joining it would multiply every attempt row by its answer count and wreck
 * the attempt counts and the score averages in the same select.
 */
const ANSWER_COUNT =
  '(SELECT COUNT(*) FROM answer_log l ' +
  'JOIN exams e2 ON e2.id = l.exam_id ' +
  'WHERE e2."courseId" = exam."courseId")';
const CORRECT_COUNT =
  '(SELECT COUNT(*) FROM answer_log l ' +
  'JOIN exams e2 ON e2.id = l.exam_id ' +
  'WHERE e2."courseId" = exam."courseId" AND l.is_correct)';

@Injectable()
export class ExamAnalyticsService {
  private readonly logger = new Logger(ExamAnalyticsService.name);

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
  ) {}

  /**
   * Attempt volume and scoring, grouped by course.
   *
   * Grouped by course rather than by catalogue exam on purpose. An attempt is
   * drawn from a course, and `exam_stage_id` - the link to the catalogue -
   * is null on everything taken before that column existed. Grouping by stage
   * here would report on a sliver of the data and silently omit the rest;
   * GET /exams/:id/results is the stage-scoped view, and it says so.
   */
  async report(query: ExamAnalyticsQueryDto): Promise<ExamAnalyticsDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    try {
      const [summary, total, rows] = await Promise.all([
        this.summary(query),
        this.baseQuery(query)
          .select('COUNT(DISTINCT exam."courseId")', 'count')
          .getRawOne<{ count: string }>()
          .then((row) => Number(row?.count ?? 0)),
        this.baseQuery(query)
          .select('exam."courseId"', 'courseId')
          .addSelect('course."courseName"', 'courseName')
          .addSelect('COUNT(*)', 'attempts')
          .addSelect(`COUNT(*) FILTER (WHERE ${COMPLETED})`, 'completed')
          .addSelect('COUNT(DISTINCT exam."userId")', 'distinctStudents')
          .addSelect(`AVG(${RATIO}) FILTER (WHERE ${COMPLETED})`, 'averageScore')
          .addSelect(`MAX(${RATIO}) FILTER (WHERE ${COMPLETED})`, 'highestScore')
          .addSelect(`MIN(${RATIO}) FILTER (WHERE ${COMPLETED})`, 'lowestScore')
          .addSelect(ANSWER_COUNT, 'attempted')
          .addSelect(CORRECT_COUNT, 'correct')
          .addSelect('MAX(exam."completedAt")', 'lastAttemptAt')
          .groupBy('exam."courseId"')
          .addGroupBy('course."courseName"')
          .orderBy('COUNT(*)', 'DESC')
          .addOrderBy('exam."courseId"', 'ASC')
          .offset((page - 1) * limit)
          .limit(limit)
          .getRawMany<AnalyticsRow>(),
      ]);

      return {
        summary,
        items: rows.map((row) => this.toRow(row)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to build exam analytics: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException('Failed to load exam analytics');
    }
  }

  private async summary(
    query: ExamAnalyticsQueryDto,
  ): Promise<ExamAnalyticsSummaryDto> {
    const row = await this.baseQuery(query)
      .select('COUNT(*)', 'totalAttempts')
      .addSelect(`COUNT(*) FILTER (WHERE ${COMPLETED})`, 'completed')
      .addSelect(`AVG(${RATIO}) FILTER (WHERE ${COMPLETED})`, 'averageScore')
      .addSelect('COUNT(DISTINCT exam."userId")', 'distinctStudents')
      .getRawOne<SummaryRow>();

    const totalAttempts = Number(row?.totalAttempts ?? 0);
    const completed = Number(row?.completed ?? 0);

    return {
      totalAttempts,
      completed,
      // Everything that is not completed: pending, in progress, or expired.
      abandoned: totalAttempts - completed,
      completionRate:
        totalAttempts === 0
          ? null
          : Math.round((completed / totalAttempts) * 1000) / 10,
      averageScore: this.percent(row?.averageScore ?? null),
      distinctStudents: Number(row?.distinctStudents ?? 0),
    };
  }

  /** Built fresh per call: one builder cannot carry two different selects. */
  private baseQuery(query: ExamAnalyticsQueryDto): SelectQueryBuilder<Exam> {
    // Inner join: an attempt whose course was hard-deleted has nothing to
    // label it with, and the course FK is CASCADE so that leaves no orphans
    // in practice.
    const builder = this.examRepository
      .createQueryBuilder('exam')
      .innerJoin(
        'course',
        'course',
        'course.id = exam."courseId" AND course."deletedAt" IS NULL',
      );

    if (query.courseId !== undefined) {
      builder.where('exam."courseId" = :courseId', {
        courseId: query.courseId,
      });
    }
    return builder;
  }

  private toRow(row: AnalyticsRow): ExamAnalyticsRowDto {
    const attempted = Number(row.attempted);
    const correct = Number(row.correct);

    return {
      courseId: Number(row.courseId),
      courseName: row.courseName,
      attempts: Number(row.attempts),
      completed: Number(row.completed),
      distinctStudents: Number(row.distinctStudents),
      averageScore: this.percent(row.averageScore),
      highestScore: this.percent(row.highestScore),
      lowestScore: this.percent(row.lowestScore),
      accuracy:
        attempted === 0 ? null : Math.round((correct / attempted) * 1000) / 10,
      lastAttemptAt: row.lastAttemptAt,
    };
  }

  /** A 0-1 ratio from SQL as a percentage to one decimal, nulls preserved. */
  private percent(value: string | null): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return Math.round(Number(value) * 1000) / 10;
  }
}
