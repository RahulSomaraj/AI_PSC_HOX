import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Question } from '../questions/entities/question.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Role } from '../common/enums/role.enum';
import { BatchStatus } from '../common/enums/batch-status.enum';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { RecentQuestionDto } from './dto/recent-question.dto';
import { DailyAttemptCountDto } from './dto/daily-attempt-count.dto';
import { DashboardSeriesDto } from './dto/dashboard-series.dto';
import { UpcomingExamDto } from './dto/upcoming-exam.dto';
import { ActivityService } from '../activity/activity.service';

/**
 * Which batch states count as "running" for the KPI tile.
 *
 * `status` carries two unrelated ideas in one column - `active`/`inactive`
 * are admin intent, `upcoming`/`ongoing` are lifecycle - so a batch being
 * run right now can legitimately hold either `active` or `ongoing`.
 */
const RUNNING_BATCH_STATUSES = [BatchStatus.Active, BatchStatus.Ongoing];

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  /** IANA zone the attempt chart is bucketed by, matching ActivityService. */
  private readonly timeZone: string;

  /**
   * Counts come from the entities rather than the owning services because
   * UsersModule does not export UsersService and BatchesService has no count
   * method - only a paginated findAll, which would fetch rows to discard
   * them. SubscriptionsService is the exception: "active" there means
   * not-expired AND not-cancelled AND held by a live user, and a second copy
   * of that predicate would drift from the one behind
   * /subscriptions/stats/active-count.
   */
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
    @InjectRepository(Exam)
    private readonly examRepository: Repository<Exam>,
    private readonly subscriptionsService: SubscriptionsService,
    configService: ConfigService,
    private readonly activityService: ActivityService,
  ) {
    this.timeZone =
      configService.get<string>('ACTIVITY_TIMEZONE') ?? 'Asia/Kolkata';
  }

  /** The three KPI tiles. Issued in parallel; one slow count should not stack. */
  async summary(): Promise<DashboardSummaryDto> {
    try {
      const [totalStudents, activeBatches, subscriptions] = await Promise.all([
        // deletedAt is a plain nullable column on User, not a
        // @DeleteDateColumn, so TypeORM does not exclude soft-deleted rows
        // on its own - the IsNull() is load-bearing.
        this.userRepository.count({
          where: { role: Role.User, deletedAt: IsNull() },
        }),
        // Batch does use @DeleteDateColumn, so soft-deleted rows are already
        // excluded here.
        this.batchRepository.count({
          where: { status: In(RUNNING_BATCH_STATUSES) },
        }),
        this.subscriptionsService.countActive(),
      ]);

      return {
        totalStudents,
        activeBatches,
        activeSubscriptions: subscriptions.activeSubscriptions,
        // Always 0 until exams can be scheduled. Nothing in the catalogue
        // carries a date - decision D1 in CLAUDE.md - so there is no "today"
        // to count against. Sent as 0 rather than omitted because the
        // console's DashboardSummary requires the field.
        todaysExams: 0,
      };
    } catch (error) {
      this.logger.error(
        `Failed to build dashboard summary: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Failed to load dashboard summary',
      );
    }
  }

  /**
   * The most recently authored questions, newest first.
   *
   * Retired questions are excluded, matching QuestionsService.findAll -
   * `isActive` is the retire flag and Question has no soft delete.
   */
  async recentQuestions(limit: number): Promise<RecentQuestionDto[]> {
    try {
      const questions = await this.questionRepository.find({
        where: { isActive: true },
        relations: ['subject'],
        order: { createdAt: 'DESC', id: 'DESC' },
        take: limit,
      });

      return questions.map((question) => ({
        id: question.id,
        title: question.question,
        subject: question.subject?.name ?? null,
        addedOn: new Date(question.createdAt).toISOString(),
        difficulty: question.difficulty,
      }));
    } catch (error) {
      this.logger.error(
        `Failed to load recent questions: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException('Failed to load recent questions');
    }
  }

  /**
   * Exam attempts started per day, oldest first and gap-filled so the chart
   * draws a continuous line.
   *
   * Bucketed in SQL rather than in JS: `createdAt` is timestamptz, and
   * letting Postgres do the AT TIME ZONE conversion keeps the day boundary
   * identical to the one /dashboard/dau uses.
   */
  async examAttempts(days: number): Promise<DailyAttemptCountDto[]> {
    try {
      const to = this.today();
      const from = this.shiftDate(to, -(days - 1));

      // Column names on Exam are camelCase (the entity declares no `name:`
      // overrides), so they must stay quoted in raw SQL or Postgres folds
      // them to lower case.
      // The zone is cast explicitly: a bare parameter beside AT TIME ZONE can
      // leave Postgres unable to infer the operand type.
      const localDate = `("exam"."createdAt" AT TIME ZONE CAST(:tz AS text))::date`;

      const rows = await this.examRepository
        .createQueryBuilder('exam')
        .select(`TO_CHAR(${localDate}, 'YYYY-MM-DD')`, 'date')
        .addSelect('COUNT(*)', 'count')
        .where(`${localDate} BETWEEN :from AND :to`, { from, to })
        .setParameter('tz', this.timeZone)
        .groupBy(localDate)
        .getRawMany<{ date: string; count: string }>();

      const countByDate = new Map(
        rows.map((row) => [row.date, Number(row.count)]),
      );

      const series: DailyAttemptCountDto[] = [];
      for (let offset = days - 1; offset >= 0; offset--) {
        const date = this.shiftDate(to, -offset);
        series.push({ date, count: countByDate.get(date) ?? 0 });
      }
      return series;
    } catch (error) {
      this.logger.error(
        `Failed to load exam attempts: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException('Failed to load exam attempts');
    }
  }

  /**
   * The Upcoming Exams table. **Always empty for now.**
   *
   * Nothing in the catalogue carries a date - `exam_posts` and `exam_stages`
   * have no schedule column, and nothing else in the API schedules an exam
   * (decision D1 in CLAUDE.md). With no date there is no "upcoming", and
   * inventing one from creation times or attempt history would put exams on
   * the dashboard that nobody scheduled.
   *
   * The route exists so the console's table renders its empty state instead
   * of an error. Once D1 settles where a schedule lives, this is the one
   * method to fill in; the response shape will not change.
   */
  async upcomingExams(_limit: number): Promise<UpcomingExamDto[]> {
    return [];
  }

  /**
   * The exam-attempts chart, in the console's DashboardSeries shape.
   *
   * `total` is the plain sum of the days. That is safe here in a way it is
   * not for DAU: every attempt is its own row, so no attempt can be counted
   * on two days.
   */
  async examAttemptsSeries(days: number): Promise<DashboardSeriesDto> {
    const series = await this.examAttempts(days);
    return {
      total: series.reduce((sum, day) => sum + day.count, 0),
      points: series.map((day) => this.toPoint(day)),
    };
  }

  /**
   * The daily-active-students chart, in the console's DashboardSeries shape.
   *
   * `total` is distinct students across the whole window, **not** the sum of
   * the days: a student active on Monday and Tuesday is one active student,
   * and summing would count them twice. The console's spec asks for exactly
   * this (BACKEND_ISSUES.md, Dashboard, point 1).
   */
  async dailyActiveSeries(days: number): Promise<DashboardSeriesDto> {
    try {
      const [series, total] = await Promise.all([
        this.activityService.dailyActiveUsers(days, Role.User),
        this.activityService.distinctActiveUsers(days, Role.User),
      ]);
      return { total, points: series.map((day) => this.toPoint(day)) };
    } catch (error) {
      this.logger.error(
        `Failed to load daily active students: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Failed to load daily active students',
      );
    }
  }

  /**
   * One day as a chart point: the weekday the axis draws, the count, and the
   * date itself so a window longer than a week stays unambiguous.
   *
   * The weekday is read off the calendar date at UTC midnight. `date` is
   * already a day in the activity timezone, so reading it back in UTC names
   * that same day rather than shifting it.
   */
  private toPoint(day: { date: string; count: number }) {
    return {
      label: new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        timeZone: 'UTC',
      }).format(new Date(`${day.date}T00:00:00Z`)),
      value: day.count,
      date: day.date,
    };
  }

  /**
   * Today in the configured timezone as 'YYYY-MM-DD'. en-CA because its
   * short date format is already ISO-ordered - same trick as ActivityService.
   */
  private today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
    }).format(new Date());
  }

  /** Shift a 'YYYY-MM-DD' string by whole days, staying in that format. */
  private shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T00:00:00Z`);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return shifted.toISOString().slice(0, 10);
  }
}
