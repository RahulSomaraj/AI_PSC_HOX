import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { Exam } from '../exam/entities/exam.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { User } from '../users/entities/user.entity';
import { ExamResultRowDto, ExamResultsDto } from './dto/exam-result-row.dto';

/** Raw shape of one grouped row; Postgres returns the aggregates as text. */
interface ResultRow {
  attemptId: number;
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  stageId: number;
  stageName: string;
  score: number | null;
  totalPossibleScore: number | null;
  completedAt: Date;
  attempted: string;
  correct: string;
}

@Injectable()
export class ExamResultsService {
  private readonly logger = new Logger(ExamResultsService.name);

  constructor(
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
  ) {}

  /**
   * Every completed attempt filed against a stage of one catalogue exam post.
   *
   * Only attempts carrying an `exam_stage_id` appear. Nothing written before
   * that column existed has one, and nothing can give it one retroactively -
   * an attempt records a course and a list of question IDs, neither of which
   * identifies a catalogue exam. So this roster starts empty on an existing
   * database and fills as new attempts are taken.
   *
   * Completed attempts only: a pending or expired one has no score to rank.
   */
  async forExamPost(
    examPostId: number,
    stageId: number | undefined,
    page: number,
    limit: number,
  ): Promise<ExamResultsDto> {
    await this.assertExamPostExists(examPostId);

    try {
      const total = await this.baseQuery(examPostId, stageId)
        .select('COUNT(DISTINCT exam.id)', 'count')
        .getRawOne<{ count: string }>()
        .then((row) => Number(row?.count ?? 0));

      const attempted = 'COUNT(log.id)';
      const correct = 'COUNT(log.id) FILTER (WHERE log.is_correct)';
      // NULLIF guards the attempts that recorded no total to divide by.
      const percentage =
        'exam."score"::float / NULLIF(exam."totalPossibleScore", 0)';

      const rows = await this.baseQuery(examPostId, stageId)
        .select('exam.id', 'attemptId')
        .addSelect('exam."userId"', 'userId')
        .addSelect('student."firstName"', 'firstName')
        .addSelect('student."lastName"', 'lastName')
        .addSelect('student."email"', 'email')
        .addSelect('stage.id', 'stageId')
        .addSelect('stage.name', 'stageName')
        .addSelect('exam."score"', 'score')
        .addSelect('exam."totalPossibleScore"', 'totalPossibleScore')
        .addSelect('exam."completedAt"', 'completedAt')
        .addSelect(attempted, 'attempted')
        .addSelect(correct, 'correct')
        .groupBy('exam.id')
        .addGroupBy('stage.id')
        .addGroupBy('stage.name')
        .addGroupBy('student.id')
        // Best first. An attempt with no percentage cannot be ranked against
        // one that has one, so it sorts last rather than to the top.
        .orderBy(percentage, 'DESC', 'NULLS LAST')
        // Earlier finish wins a tie, then id so the page boundary is stable.
        .addOrderBy('exam."completedAt"', 'ASC')
        .addOrderBy('exam.id', 'ASC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<ResultRow>();

      return {
        items: this.rank(rows, (page - 1) * limit),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to load results for exam post ${examPostId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException('Failed to load exam results');
    }
  }

  /**
   * The joins and filters shared by the count and the page, built twice
   * rather than cloned: a query builder carrying a GROUP BY cannot be reused
   * for a COUNT of the same rows.
   */
  private baseQuery(
    examPostId: number,
    stageId: number | undefined,
  ): SelectQueryBuilder<Exam> {
    const query = this.examRepository
      .createQueryBuilder('exam')
      // Inner join on the stage is what restricts this to catalogue sittings:
      // a practice attempt has a null exam_stage_id and drops out here.
      .innerJoin(
        ExamStage,
        'stage',
        'stage.id = exam.exam_stage_id AND stage.deleted_at IS NULL',
      )
      .innerJoin(
        User,
        'student',
        'student.id = exam."userId" AND student."deletedAt" IS NULL',
      )
      // Left, so an attempt whose answers predate the answer log still shows
      // its score - it just reports zero questions counted.
      .leftJoin(AnswerLog, 'log', 'log.exam_id = exam.id')
      .where('stage.exam_id = :examPostId', { examPostId })
      .andWhere("exam.\"status\" = 'completed'");

    if (stageId !== undefined) {
      query.andWhere('stage.id = :stageId', { stageId });
    }
    return query;
  }

  /**
   * Competition ranking over the page: equal percentages share a rank and
   * the next one skips (1, 2, 2, 4). Offset by the page start so rank is
   * the position in the whole roster, not within the page.
   */
  private rank(rows: ResultRow[], offset: number): ExamResultRowDto[] {
    let lastPercentage: number | null | undefined;
    let lastRank = 0;

    return rows.map((row, index) => {
      const attempted = Number(row.attempted);
      const correct = Number(row.correct);
      const percentage =
        row.totalPossibleScore && row.score !== null
          ? Math.round((row.score / row.totalPossibleScore) * 1000) / 10
          : null;

      const position = offset + index + 1;
      if (percentage !== lastPercentage) {
        lastRank = position;
        lastPercentage = percentage;
      }

      return {
        rank: lastRank,
        attemptId: Number(row.attemptId),
        userId: Number(row.userId),
        studentName: `${row.firstName} ${row.lastName}`.trim(),
        email: row.email,
        stageId: Number(row.stageId),
        stageName: row.stageName,
        score: row.score,
        totalPossibleScore: row.totalPossibleScore,
        percentage,
        attempted,
        correct,
        incorrect: attempted - correct,
        completedAt: row.completedAt,
      };
    });
  }

  /** 404 for an unknown or soft-deleted exam post, matching GET /exams/:id. */
  private async assertExamPostExists(examPostId: number): Promise<void> {
    const exists = await this.examPostRepository.exists({
      where: { id: examPostId, deletedAt: IsNull() },
    });
    if (!exists) {
      throw new NotFoundException(`Exam with ID ${examPostId} not found`);
    }
  }
}
