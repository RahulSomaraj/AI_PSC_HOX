import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import {
  StudentPerformanceDto,
  StudentPerformanceRowDto,
} from './dto/student-performance.dto';
import {
  SortOrder,
  StudentPerformanceQueryDto,
  StudentPerformanceSortBy,
} from './dto/student-performance-query.dto';

interface PerformanceRow {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  batchId: number | null;
  batchName: string | null;
  examsTaken: string;
  averageScore: string | null;
  attempted: string;
  correct: string;
  lastActiveOn: string | null;
}

/**
 * Each aggregate is a correlated subquery rather than a join.
 *
 * Joining answer_log and exams to users in one statement multiplies rows -
 * a student with 400 answers and 12 attempts would produce 4,800 - and every
 * count after that is wrong. Subqueries keep one row per student, and the
 * page is only ever 100 students wide.
 */
const AGGREGATES = {
  examsTaken:
    '(SELECT COUNT(*) FROM exams e WHERE e."userId" = student.id ' +
    "AND e.\"status\" = 'completed')",
  averageScore:
    '(SELECT AVG(e."score"::float / NULLIF(e."totalPossibleScore", 0)) ' +
    'FROM exams e WHERE e."userId" = student.id ' +
    "AND e.\"status\" = 'completed')",
  attempted: '(SELECT COUNT(*) FROM answer_log l WHERE l.user_id = student.id)',
  correct:
    '(SELECT COUNT(*) FROM answer_log l WHERE l.user_id = student.id ' +
    'AND l.is_correct)',
  lastActiveOn:
    "(SELECT TO_CHAR(MAX(a.activity_date), 'YYYY-MM-DD') " +
    'FROM user_activity a WHERE a.user_id = student.id)',
} as const;

/** Accuracy repeated inline, because ORDER BY cannot see a SELECT alias. */
const ACCURACY = `${AGGREGATES.correct}::float / NULLIF(${AGGREGATES.attempted}, 0)`;

const SORT_EXPRESSIONS: Record<StudentPerformanceSortBy, string> = {
  [StudentPerformanceSortBy.Accuracy]: ACCURACY,
  [StudentPerformanceSortBy.AverageScore]: AGGREGATES.averageScore,
  [StudentPerformanceSortBy.ExamsTaken]: AGGREGATES.examsTaken,
  [StudentPerformanceSortBy.Name]: 'student."firstName"',
};

@Injectable()
export class StudentPerformanceService {
  private readonly logger = new Logger(StudentPerformanceService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * One row per student, with their accuracy, exam average and last activity.
   *
   * Every student with the `user` role appears, including one who has
   * answered nothing - the tab is a roster, not a leaderboard of the active,
   * and an empty row is itself the useful signal. Those students report null
   * accuracy and sort last.
   */
  async report(
    query: StudentPerformanceQueryDto,
  ): Promise<StudentPerformanceDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const sortBy = query.sortBy ?? StudentPerformanceSortBy.Accuracy;
    const sortOrder = query.sortOrder ?? SortOrder.Desc;

    try {
      const total = await this.baseQuery(query).getCount();

      const rows = await this.baseQuery(query)
        .select('student.id', 'userId')
        .addSelect('student."firstName"', 'firstName')
        .addSelect('student."lastName"', 'lastName')
        .addSelect('student."email"', 'email')
        .addSelect('profile.batch_id', 'batchId')
        .addSelect('batch.name', 'batchName')
        .addSelect(AGGREGATES.examsTaken, 'examsTaken')
        .addSelect(AGGREGATES.averageScore, 'averageScore')
        .addSelect(AGGREGATES.attempted, 'attempted')
        .addSelect(AGGREGATES.correct, 'correct')
        .addSelect(AGGREGATES.lastActiveOn, 'lastActiveOn')
        // A student who has answered nothing has no accuracy to rank, so
        // they sort to the end whichever direction is asked for.
        .orderBy(SORT_EXPRESSIONS[sortBy], sortOrder, 'NULLS LAST')
        // Stable page boundaries: without this, two students on the same
        // accuracy could swap between pages.
        .addOrderBy('student.id', 'ASC')
        .offset((page - 1) * limit)
        .limit(limit)
        .getRawMany<PerformanceRow>();

      return {
        items: rows.map((row) => this.toRow(row)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to build the student performance report: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Failed to load student performance',
      );
    }
  }

  /**
   * Students and their batch. Built fresh per call rather than cloned: the
   * count runs it without the select list, and reusing one builder for both
   * would carry the aggregates into the COUNT.
   */
  private baseQuery(
    query: StudentPerformanceQueryDto,
  ): SelectQueryBuilder<User> {
    // Left joins: batch assignment lives on the aspirant profile and is
    // optional twice over, so requiring either would silently drop every
    // student who has not been placed in a batch.
    const builder = this.userRepository
      .createQueryBuilder('student')
      .leftJoin(
        'aspirant_profiles',
        'profile',
        'profile.user_id = student.id',
      )
      .leftJoin(
        'batches',
        'batch',
        'batch.id = profile.batch_id AND batch.deleted_at IS NULL',
      )
      .where('student.role = :role', { role: Role.User })
      .andWhere('student."deletedAt" IS NULL');

    if (query.batchId !== undefined) {
      builder.andWhere('profile.batch_id = :batchId', {
        batchId: query.batchId,
      });
    }

    if (query.search) {
      builder.andWhere(
        `(student."firstName" ILIKE :search OR student."lastName" ILIKE :search
          OR student."email" ILIKE :search)`,
        { search: `%${query.search}%` },
      );
    }

    return builder;
  }

  private toRow(row: PerformanceRow): StudentPerformanceRowDto {
    const attempted = Number(row.attempted);
    const correct = Number(row.correct);
    const averageScore =
      row.averageScore === null ? null : Number(row.averageScore);

    return {
      userId: Number(row.userId),
      studentName: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      batchId: row.batchId === null ? null : Number(row.batchId),
      batchName: row.batchName,
      examsTaken: Number(row.examsTaken),
      averageScore:
        averageScore === null ? null : Math.round(averageScore * 1000) / 10,
      attempted,
      correct,
      accuracy:
        attempted === 0 ? null : Math.round((correct / attempted) * 1000) / 10,
      lastActiveOn: row.lastActiveOn,
    };
  }
}
