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
  GrowthEngagementDto,
  GrowthPointDto,
} from './dto/growth-engagement.dto';

interface DailyCount {
  date: string;
  count: string;
}

@Injectable()
export class GrowthEngagementService {
  private readonly logger = new Logger(GrowthEngagementService.name);

  /** Same zone as /dashboard/dau, so every chart shares a day boundary. */
  private readonly timeZone: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    configService: ConfigService,
  ) {
    this.timeZone =
      configService.get<string>('ACTIVITY_TIMEZONE') ?? 'Asia/Kolkata';
  }

  /**
   * Signups, active users, new subscriptions and attempts per day.
   *
   * Every series is gap-filled and ordered oldest first, matching the
   * dashboard charts, so a quiet day is a zero rather than a missing point.
   *
   * One caveat worth passing on to whoever reads the tab: `activeUsers` can
   * only cover the period since presence tracking shipped. A window reaching
   * further back reports zeros for the earlier days, which is absence of
   * measurement rather than absence of activity.
   */
  async report(days: number): Promise<GrowthEngagementDto> {
    try {
      const to = this.today();
      const from = this.shiftDate(to, -(days - 1));

      const [signups, active, subscriptions, attempts, distinct, returning] =
        await Promise.all([
          this.dailySignups(from, to),
          this.dailyActive(from, to),
          this.dailySubscriptions(from, to),
          this.dailyAttempts(from, to),
          this.distinctActive(from, to),
          this.returningRate(from),
        ]);

      const series: GrowthPointDto[] = [];
      for (let offset = days - 1; offset >= 0; offset--) {
        const date = this.shiftDate(to, -offset);
        series.push({
          date,
          signups: signups.get(date) ?? 0,
          activeUsers: active.get(date) ?? 0,
          newSubscriptions: subscriptions.get(date) ?? 0,
          examAttempts: attempts.get(date) ?? 0,
        });
      }

      const sum = (pick: (point: GrowthPointDto) => number) =>
        series.reduce((total, point) => total + pick(point), 0);

      const totalActive = sum((point) => point.activeUsers);

      return {
        summary: {
          signups: sum((point) => point.signups),
          newSubscriptions: sum((point) => point.newSubscriptions),
          examAttempts: sum((point) => point.examAttempts),
          // Distinct across the whole window rather than the sum of the daily
          // counts: a student seen on five days is one active user, not five.
          activeUsers: distinct,
          averageDailyActive:
            Math.round((totalActive / series.length) * 10) / 10,
          returningRate: returning,
        },
        series,
      };
    } catch (error) {
      this.logger.error(
        `Failed to build growth and engagement: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException(
        'Failed to load growth and engagement',
      );
    }
  }

  /**
   * Buckets a timestamptz column by local day and counts the rows per day.
   *
   * Written once and pointed at three tables rather than hand-rolled three
   * times: they ask the same question, and three separate GROUP BYs would be
   * three chances to get the timezone conversion subtly different.
   *
   * `table`, `dateColumn` and `extraWhere` are interpolated, not bound - they
   * are fixed strings from the private callers below, never request input.
   * Only the timezone and the two dates are bound.
   */
  private async dailyFrom(
    table: string,
    dateColumn: string,
    from: string,
    to: string,
    extraWhere = '',
  ): Promise<Map<string, number>> {
    const localDate = `(t.${dateColumn} AT TIME ZONE CAST($1 AS text))::date`;

    const rows: DailyCount[] = await this.userRepository.query(
      `SELECT TO_CHAR(${localDate}, 'YYYY-MM-DD') AS date, COUNT(*) AS count
       FROM ${table} t
       WHERE ${localDate} BETWEEN $2 AND $3 ${extraWhere}
       GROUP BY ${localDate}`,
      [this.timeZone, from, to],
    );

    return new Map(rows.map((row) => [row.date, Number(row.count)]));
  }

  private dailySignups(from: string, to: string): Promise<Map<string, number>> {
    return this.dailyFrom(
      'users',
      '"createdAt"',
      from,
      to,
      `AND t.role = '${Role.User}' AND t."deletedAt" IS NULL`,
    );
  }

  /** deletedAt is a plain column here, so soft-deleted rows need excluding. */
  private dailySubscriptions(
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    return this.dailyFrom(
      'subscriptions',
      '"startDate"',
      from,
      to,
      'AND t."deletedAt" IS NULL',
    );
  }

  private dailyAttempts(
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    return this.dailyFrom('exams', '"createdAt"', from, to);
  }

  /**
   * user_activity stores a plain `date`, already bucketed by the tracker when
   * it was written, so this one needs no conversion - and must not apply one.
   */
  private async dailyActive(
    from: string,
    to: string,
  ): Promise<Map<string, number>> {
    const rows: DailyCount[] = await this.userRepository.query(
      `SELECT TO_CHAR(a.activity_date, 'YYYY-MM-DD') AS date,
              COUNT(*) AS count
       FROM user_activity a
       JOIN users u ON u.id = a.user_id
       WHERE a.activity_date BETWEEN $1 AND $2
         AND u.role = $3 AND u."deletedAt" IS NULL
       GROUP BY a.activity_date`,
      [from, to, Role.User],
    );
    return new Map(rows.map((row) => [row.date, Number(row.count)]));
  }

  private async distinctActive(from: string, to: string): Promise<number> {
    const rows: Array<{ count: string }> = await this.userRepository.query(
      `SELECT COUNT(DISTINCT a.user_id) AS count
       FROM user_activity a
       JOIN users u ON u.id = a.user_id
       WHERE a.activity_date BETWEEN $1 AND $2
         AND u.role = $3 AND u."deletedAt" IS NULL`,
      [from, to, Role.User],
    );
    return Number(rows[0]?.count ?? 0);
  }

  /**
   * How much of the pre-existing student body came back during the window.
   *
   * Anyone who signed up inside the window is excluded from both halves of
   * the fraction: counting a brand-new student as "returning" would make the
   * number climb with growth rather than with retention.
   */
  private async returningRate(from: string): Promise<number | null> {
    const rows: Array<{ existing: string; returned: string }> =
      await this.userRepository.query(
        `SELECT COUNT(*) AS existing,
                COUNT(*) FILTER (
                  WHERE EXISTS (
                    SELECT 1 FROM user_activity a
                    WHERE a.user_id = u.id AND a.activity_date >= $1
                  )
                ) AS returned
         FROM users u
         WHERE u.role = $2 AND u."deletedAt" IS NULL
           AND (u."createdAt" AT TIME ZONE CAST($3 AS text))::date < $1`,
        [from, Role.User, this.timeZone],
      );

    const existing = Number(rows[0]?.existing ?? 0);
    if (existing === 0) {
      return null;
    }
    return Math.round((Number(rows[0].returned) / existing) * 1000) / 10;
  }

  /** Today in the configured zone, as 'YYYY-MM-DD'. */
  private today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
    }).format(new Date());
  }

  private shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T00:00:00Z`);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return shifted.toISOString().slice(0, 10);
  }
}
