import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import {
  BatchCompletionDto,
  ContentUsageTabDto,
  EngagementTabDto,
  ExamAnalyticsTabDto,
  ReportPointDto,
  StudentPerformanceTabDto,
  SubjectScoreDto,
} from './dto/report-tabs.dto';

/** How far back "active" and "engaged" look. */
const ACTIVE_WINDOW_DAYS = 30;
/** The sign-ups chart and the New Sign-ups figure. */
const SIGNUP_WINDOW_DAYS = 7;
/** Rows in Top Engaged Students. */
const ENGAGED_LIMIT = 50;

/** The score of one attempt, 0-1. Null when the attempt had no possible score. */
const ATTEMPT_SCORE = 'e."score"::float / NULLIF(e."totalPossibleScore", 0)';

const round = (value: number, places: number) => {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** 0-1 from the database to 0-100 for the console, or 0 when there is none. */
const percent = (fraction: string | number | null | undefined, places = 1) =>
  fraction === null || fraction === undefined
    ? 0
    : round(Number(fraction) * 100, places);

/**
 * The four Reports tabs, in the shapes the console was built against
 * (BACKEND_ISSUES.md P2-4).
 *
 * One call per tab, each answered whole: the tabs are read top to bottom, and
 * a tab made of five endpoints would be five loading and error states.
 *
 * Raw SQL through `repository.query`, following the other reports services:
 * each tab reads across five or six tables that no single entity owns, and
 * the column quoting here is the same as theirs - camelCase columns on
 * `users` and `exams` quoted, snake_case elsewhere.
 *
 * The richer per-student, per-course and per-day reports built before the
 * console's shape was known still exist, under sub-routes - see
 * ReportsController.
 */
@Injectable()
export class ReportTabsService {
  private readonly logger = new Logger(ReportTabsService.name);
  private readonly timeZone: string;

  constructor(
    // Only used for `.query()`; every table is reached by name in SQL.
    @InjectRepository(User)
    private readonly db: Repository<User>,
    configService: ConfigService,
  ) {
    this.timeZone =
      configService.get<string>('ACTIVITY_TIMEZONE') ?? 'Asia/Kolkata';
  }

  // ── Student Performance ──────────────────────────────────────────────────

  async studentPerformance(): Promise<StudentPerformanceTabDto> {
    return this.guard('student performance', async () => {
      const today = this.today();
      const activeFrom = this.shiftDate(today, -(ACTIVE_WINDOW_DAYS - 1));
      const signupFrom = this.shiftDate(today, -(SIGNUP_WINDOW_DAYS - 1));

      const [active, score, attempts, subjects, batches, signups] =
        await Promise.all([
          this.db.query(
            `SELECT COUNT(DISTINCT a.user_id) AS count
             FROM user_activity a
             JOIN users u ON u.id = a.user_id
             WHERE a.activity_date BETWEEN $1 AND $2
               AND u.role = $3 AND u."deletedAt" IS NULL`,
            [activeFrom, today, Role.User],
          ),
          this.db.query(
            `SELECT AVG(${ATTEMPT_SCORE}) AS average
             FROM exams e WHERE e."status" = 'completed'`,
          ),
          // Every attempt row, as the dashboard's attempts chart counts them.
          this.db.query(`SELECT COUNT(*) AS count FROM exams e`),
          this.subjectAccuracy(),
          this.db.query(
            `SELECT b.name AS batch,
                    TO_CHAR(b.start_date, 'YYYY-MM-DD') AS "startDate",
                    TO_CHAR(b.end_date, 'YYYY-MM-DD') AS "endDate"
             FROM batches b
             WHERE b.deleted_at IS NULL
             ORDER BY b.name ASC, b.id ASC`,
          ),
          this.signupsPerDay(signupFrom, today),
        ]);

      const weeklySignups = this.days(signupFrom, SIGNUP_WINDOW_DAYS).map(
        (date): ReportPointDto => ({
          label: this.weekday(date),
          value: signups.get(date) ?? 0,
        }),
      );

      return {
        summary: {
          activeStudents: Number(active[0]?.count ?? 0),
          // Two decimals: the design prints "72.80%".
          averageExamScore: percent(score[0]?.average, 2),
          examsAttempted: Number(attempts[0]?.count ?? 0),
          newSignups: weeklySignups.reduce((sum, day) => sum + day.value, 0),
        },
        // Returned whole and in name order, not pre-sorted by weakness: the
        // card takes the five weakest itself (P2-4, Q66).
        weakSubjects: subjects,
        // The same figures. Both panels are accuracy per subject - one as a
        // "weakest" list, one as a chart - and there is only one accuracy.
        averageAccuracy: subjects,
        batchCompletion: batches.map(
          (row: { batch: string; startDate: string; endDate: string }) =>
            this.completion(row, today),
        ),
        weeklySignups,
      };
    });
  }

  /** Accuracy per subject across every answer anyone has given. */
  private async subjectAccuracy(): Promise<SubjectScoreDto[]> {
    const rows: Array<{ subject: string; attempted: string; correct: string }> =
      await this.db.query(
        `SELECT s.name AS subject,
                COUNT(*) AS attempted,
                COUNT(*) FILTER (WHERE l.is_correct) AS correct
         FROM answer_log l
         JOIN subjects s ON s.id = l.subject_id AND s.deleted_at IS NULL
         GROUP BY s.id, s.name
         ORDER BY s.name ASC, s.id ASC`,
      );

    return rows.map((row) => ({
      subject: row.subject,
      percentage: round((Number(row.correct) / Number(row.attempted)) * 100, 1),
    }));
  }

  /**
   * How far through its schedule a batch is, from its start and end dates.
   *
   * Nothing records a syllabus being covered, so "completion" is the share of
   * the batch's planned duration that has passed: 0 before it starts, 100
   * once it has ended.
   */
  private completion(
    row: { batch: string; startDate: string; endDate: string },
    today: string,
  ): BatchCompletionDto {
    const day = (date: string) => Date.parse(`${date}T00:00:00Z`);
    const start = day(row.startDate);
    const end = day(row.endDate);
    const now = day(today);

    let fraction: number;
    if (now <= start) fraction = 0;
    else if (now >= end) fraction = 1;
    else fraction = (now - start) / (end - start);

    return { batch: row.batch, percentage: round(fraction * 100, 1) };
  }

  /** Student sign-ups per local day between two dates. */
  private async signupsPerDay(
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const localDate = `(u."createdAt" AT TIME ZONE CAST($1 AS text))::date`;
    const rows: Array<{ date: string; count: string }> = await this.db.query(
      `SELECT TO_CHAR(${localDate}, 'YYYY-MM-DD') AS date, COUNT(*) AS count
       FROM users u
       WHERE u.role = $2 AND u."deletedAt" IS NULL
         AND ${localDate} BETWEEN $3 AND $4
       GROUP BY ${localDate}`,
      [this.timeZone, Role.User, from, to],
    );
    return new Map(rows.map((row) => [row.date, Number(row.count)]));
  }

  // ── Exam Analytics ───────────────────────────────────────────────────────

  async examAnalytics(): Promise<ExamAnalyticsTabDto> {
    return this.guard('exam analytics', async () => {
      const [scores, participation, practice, catalogue, overall] =
        await Promise.all([
          this.db.query(
            `SELECT p.id AS "examId", p.name AS "examName",
                    AVG(${ATTEMPT_SCORE}) AS average,
                    MAX(${ATTEMPT_SCORE}) AS highest,
                    MIN(${ATTEMPT_SCORE}) AS lowest
             FROM exams e
             JOIN exam_stages st
               ON st.id = e.exam_stage_id AND st.deleted_at IS NULL
             JOIN exam_posts p ON p.id = st.exam_id AND p.deleted_at IS NULL
             WHERE e."status" = 'completed'
             GROUP BY p.id, p.name
             ORDER BY p.name ASC, p.id ASC`,
          ),
          this.participation(),
          // A practice attempt is one tied to no catalogue exam.
          this.db.query(
            `SELECT COUNT(*) AS count FROM exams e WHERE e.exam_stage_id IS NULL`,
          ),
          this.db.query(
            `SELECT COUNT(*) AS count FROM exam_posts p WHERE p.deleted_at IS NULL`,
          ),
          this.db.query(
            `SELECT AVG(${ATTEMPT_SCORE}) AS average
             FROM exams e
             JOIN exam_stages st
               ON st.id = e.exam_stage_id AND st.deleted_at IS NULL
             WHERE e."status" = 'completed'`,
          ),
        ]);

      const rows = scores.map(
        (row: {
          examId: number;
          examName: string;
          average: string | null;
          highest: string | null;
          lowest: string | null;
        }) => ({
          examId: Number(row.examId),
          examName: row.examName,
          averageScore: percent(row.average),
          highestScore: percent(row.highest),
          lowestScore: percent(row.lowest),
          participationRate: participation.get(Number(row.examId)) ?? 0,
        }),
      );

      const averageParticipation =
        rows.length === 0
          ? 0
          : round(
              rows.reduce(
                (sum: number, row: { participationRate: number }) =>
                  sum + row.participationRate,
                0,
              ) / rows.length,
              1,
            );

      return {
        summary: {
          mockTests: Number(practice[0]?.count ?? 0),
          totalExams: Number(catalogue[0]?.count ?? 0),
          averageParticipation,
          averageScore: percent(overall[0]?.average),
        },
        rows,
      };
    });
  }

  /**
   * Participation per catalogue exam: students who completed it, over the
   * students it was meant for.
   *
   * "Meant for" is anyone whose aspirant profile targets the exam, anyone in
   * a batch that targets it, **and anyone who completed it** - so a student
   * who sat an exam nobody assigned them still counts towards both halves,
   * and the rate can never pass 100 or divide by nothing.
   */
  private async participation(): Promise<Map<number, number>> {
    const rows: Array<{ examId: number; attempted: string; eligible: string }> =
      await this.db.query(
        `WITH attempted AS (
           SELECT DISTINCT st.exam_id, e."userId" AS user_id
           FROM exams e
           JOIN exam_stages st
             ON st.id = e.exam_stage_id AND st.deleted_at IS NULL
           WHERE e."status" = 'completed'
         ),
         assigned AS (
           SELECT ap.target_exam_id AS exam_id, ap.user_id
           FROM aspirant_profiles ap
           JOIN users u ON u.id = ap.user_id
           WHERE ap.deleted_at IS NULL AND ap.target_exam_id IS NOT NULL
             AND u.role = $1 AND u."deletedAt" IS NULL
           UNION
           SELECT b.exam_id, ap.user_id
           FROM aspirant_profiles ap
           JOIN batches b ON b.id = ap.batch_id AND b.deleted_at IS NULL
           JOIN users u ON u.id = ap.user_id
           WHERE ap.deleted_at IS NULL
             AND u.role = $1 AND u."deletedAt" IS NULL
         ),
         eligible AS (
           SELECT exam_id, user_id FROM assigned
           UNION
           SELECT exam_id, user_id FROM attempted
         )
         SELECT a.exam_id AS "examId",
                COUNT(DISTINCT a.user_id) AS attempted,
                (SELECT COUNT(*) FROM eligible el WHERE el.exam_id = a.exam_id)
                  AS eligible
         FROM attempted a
         GROUP BY a.exam_id`,
        [Role.User],
      );

    return new Map(
      rows.map((row) => [
        Number(row.examId),
        round((Number(row.attempted) / Number(row.eligible)) * 100, 1),
      ]),
    );
  }

  // ── Content Usage ────────────────────────────────────────────────────────

  async contentUsage(): Promise<ContentUsageTabDto> {
    return this.guard('content usage', async () => {
      const rows: Array<{
        contentId: number;
        title: string;
        type: string;
        subject: string | null;
        views: string;
      }> = await this.db.query(
        `SELECT c.id AS "contentId", c.title, c.type,
                s.name AS subject,
                COUNT(v.id) AS views
         FROM content c
         LEFT JOIN subjects s ON s.id = c.subject_id
         LEFT JOIN content_view v ON v.content_id = c.id
         WHERE c.deleted_at IS NULL
         GROUP BY c.id, c.title, c.type, s.name
         ORDER BY COUNT(v.id) DESC, c.title ASC, c.id ASC`,
      );

      const tableRows = rows.map((row) => ({
        contentId: Number(row.contentId),
        title: row.title,
        type: row.type,
        subject: row.subject,
        views: Number(row.views),
        // Nothing records how much of an item a student got through - only
        // that they opened it - so there is no completion to report.
        completionRate: 0,
      }));

      const totalViews = tableRows.reduce((sum, row) => sum + row.views, 0);

      return {
        summary: {
          contentItems: tableRows.length,
          // Rows are ordered by views, so the first is the most opened.
          mostViewedTitle:
            tableRows.length > 0 && tableRows[0].views > 0
              ? tableRows[0].title
              : null,
          totalViews,
          averageCompletion: 0,
        },
        rows: tableRows,
      };
    });
  }

  // ── Engagement ───────────────────────────────────────────────────────────

  /**
   * Top Engaged Students. The order is the ranking, and the console renders
   * it as given (P2-4, Q72): the most distinct days active in the last 30,
   * then the most recently seen.
   */
  async engagement(): Promise<EngagementTabDto> {
    return this.guard('engagement', async () => {
      const today = this.today();
      const from = this.shiftDate(today, -(ACTIVE_WINDOW_DAYS - 1));

      const rows: Array<{
        studentId: number;
        firstName: string;
        lastName: string;
        batch: string | null;
        lastActiveAt: Date | string;
      }> = await this.db.query(
        `SELECT u.id AS "studentId",
                u."firstName" AS "firstName",
                u."lastName" AS "lastName",
                b.name AS batch,
                MAX(a.last_seen_at) AS "lastActiveAt"
         FROM user_activity a
         JOIN users u ON u.id = a.user_id
         LEFT JOIN aspirant_profiles ap
           ON ap.user_id = u.id AND ap.deleted_at IS NULL
         LEFT JOIN batches b ON b.id = ap.batch_id AND b.deleted_at IS NULL
         WHERE a.activity_date BETWEEN $1 AND $2
           AND u.role = $3 AND u."deletedAt" IS NULL
         GROUP BY u.id, u."firstName", u."lastName", b.name
         ORDER BY COUNT(DISTINCT a.activity_date) DESC,
                  MAX(a.last_seen_at) DESC,
                  u.id ASC
         LIMIT $4`,
        [from, today, Role.User, ENGAGED_LIMIT],
      );

      return {
        rows: rows.map((row) => ({
          studentId: Number(row.studentId),
          name: `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim(),
          batch: row.batch,
          lastActiveAt: new Date(row.lastActiveAt).toISOString(),
        })),
      };
    });
  }

  // ── Helpers ──────────────────────────────────────────────────────────────

  /** Logs the real cause and answers 500, as the other reports do. */
  private async guard<T>(tab: string, work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      this.logger.error(
        `Failed to build the ${tab} report: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        `Failed to build the ${tab} report`,
      );
    }
  }

  /** `count` consecutive days from `from`, as 'YYYY-MM-DD'. */
  private days(from: string, count: number): string[] {
    return Array.from({ length: count }, (_, offset) =>
      this.shiftDate(from, offset),
    );
  }

  /** "Mon" for a 'YYYY-MM-DD' already in the activity timezone. */
  private weekday(date: string): string {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${date}T00:00:00Z`));
  }

  /** Today in the configured timezone as 'YYYY-MM-DD'. */
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
