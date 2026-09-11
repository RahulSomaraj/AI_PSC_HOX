import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserActivity } from './entities/user-activity.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { DailyActiveCountDto } from './dto/daily-active-count.dto';

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  /** IANA zone the activity day is bucketed by. */
  private readonly timeZone: string;

  /** How stale lastSeenAt is allowed to get before another write. */
  private readonly refreshWindowMs: number;

  /**
   * userId -> epoch ms of the last write, for the current day only.
   *
   * Without this the interceptor would issue one UPSERT per request, which
   * for a table whose entire purpose is "was this user here today" is a
   * enormous amount of write traffic for no extra information. With it, a
   * user costs one write per refresh window.
   *
   * Cleared when the day rolls over, so it stays bounded by the number of
   * users active today rather than growing forever.
   */
  private readonly lastWriteByUser = new Map<number, number>();
  private cachedDay = '';

  constructor(
    @InjectRepository(UserActivity)
    private readonly activityRepository: Repository<UserActivity>,
    configService: ConfigService,
  ) {
    this.timeZone =
      configService.get<string>('ACTIVITY_TIMEZONE') ?? 'Asia/Kolkata';

    const minutes = Number(
      configService.get<string>('ACTIVITY_REFRESH_MINUTES') ?? 5,
    );
    this.refreshWindowMs =
      (Number.isFinite(minutes) && minutes > 0 ? minutes : 5) * 60_000;
  }

  /**
   * Today's date in the configured timezone, as 'YYYY-MM-DD'.
   *
   * en-CA is used because its short date format is already ISO-ordered, so
   * no reformatting is needed and no date library is pulled in.
   */
  today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
    }).format(new Date());
  }

  /**
   * Note that a user was active right now. Called from ActivityInterceptor
   * on every authenticated request.
   *
   * Deliberately synchronous and void: the caller is in the request path and
   * must not wait on a write, nor fail if one fails. Recording activity is
   * strictly less important than serving the request, so a failure here is
   * logged and swallowed.
   */
  recordActivity(userId: number): void {
    const activityDate = this.today();

    if (activityDate !== this.cachedDay) {
      this.cachedDay = activityDate;
      this.lastWriteByUser.clear();
    }

    const now = Date.now();
    const lastWrite = this.lastWriteByUser.get(userId);
    if (lastWrite !== undefined && now - lastWrite < this.refreshWindowMs) {
      return;
    }

    // Claim the window before the await so concurrent requests from the same
    // user collapse into one write rather than racing.
    this.lastWriteByUser.set(userId, now);

    void this.write(userId, activityDate).catch((error: unknown) => {
      // Drop the claim so the next request retries rather than waiting out
      // the whole window on a transient failure.
      this.lastWriteByUser.delete(userId);
      this.logger.warn(
        `Failed to record activity for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });
  }

  /**
   * Insert today's row, or move lastSeenAt forward if it already exists.
   *
   * Written as an explicit ON CONFLICT rather than repository.upsert() so
   * that only last_seen_at is overwritten - first_seen_at must survive, and
   * an upsert built from the entity literal would be free to rewrite it.
   */
  private async write(userId: number, activityDate: string): Promise<void> {
    await this.activityRepository
      .createQueryBuilder()
      .insert()
      .into(UserActivity)
      .values({ userId, activityDate, lastSeenAt: new Date() })
      .orUpdate(['last_seen_at'], ['user_id', 'activity_date'])
      .execute();
  }

  /**
   * The Daily Active Users series, oldest first, for the dashboard chart.
   *
   * Gap-filled: a day with no activity comes back as zero rather than being
   * missing, so the chart draws a continuous line instead of joining across
   * an absent point.
   *
   * @param days how many days to return, ending today. Defaults to 7.
   * @param role narrow to one account role - pass Role.User for students.
   */
  async dailyActiveUsers(
    days = 7,
    role?: Role,
  ): Promise<DailyActiveCountDto[]> {
    const span = Number.isFinite(days) && days > 0 ? Math.floor(days) : 7;
    const to = this.today();
    const from = this.shiftDate(to, -(span - 1));

    const query = this.activityRepository
      .createQueryBuilder('activity')
      // Formatted in SQL rather than in JS: the pg driver hands back `date`
      // columns inconsistently depending on parser configuration, and a
      // Date object here would reintroduce the timezone bug the column type
      // exists to avoid.
      .select("TO_CHAR(activity.activity_date, 'YYYY-MM-DD')", 'date')
      // (user_id, activity_date) is unique, so a plain COUNT already counts
      // distinct users.
      .addSelect('COUNT(*)', 'count')
      .where('activity.activity_date BETWEEN :from AND :to', { from, to });

    if (role !== undefined) {
      query
        .innerJoin(User, 'user', 'user.id = activity.user_id')
        .andWhere('user.role = :role', { role })
        .andWhere('user.deletedAt IS NULL');
    }

    const rows = await query
      .groupBy('activity.activity_date')
      .getRawMany<{ date: string; count: string }>();

    const countByDate = new Map(
      rows.map((row) => [row.date, Number(row.count)]),
    );

    const series: DailyActiveCountDto[] = [];
    for (let offset = span - 1; offset >= 0; offset--) {
      const date = this.shiftDate(to, -offset);
      series.push({ date, count: countByDate.get(date) ?? 0 });
    }
    return series;
  }

  /**
   * Distinct users active on one date. `date` is 'YYYY-MM-DD' in the
   * configured timezone; defaults to today.
   */
  async countForDate(date?: string, role?: Role): Promise<number> {
    const target = date ?? this.today();

    const query = this.activityRepository
      .createQueryBuilder('activity')
      .where('activity.activity_date = :target', { target });

    if (role !== undefined) {
      query
        .innerJoin(User, 'user', 'user.id = activity.user_id')
        .andWhere('user.role = :role', { role })
        .andWhere('user.deletedAt IS NULL');
    }

    return await query.getCount();
  }

  /**
   * Most recent activity per user, for the admin lists that want a
   * "last active" column.
   *
   * Bulk by design: the students list needs this for a page of rows at once,
   * and doing it per row is the N+1 that makes list screens slow.
   */
  async lastSeenForUsers(userIds: number[]): Promise<Map<number, Date>> {
    if (userIds.length === 0) return new Map();

    const rows = await this.activityRepository
      .createQueryBuilder('activity')
      .select('activity.user_id', 'userId')
      .addSelect('MAX(activity.last_seen_at)', 'lastSeenAt')
      .where('activity.user_id IN (:...userIds)', { userIds })
      .groupBy('activity.user_id')
      .getRawMany<{ userId: number; lastSeenAt: Date }>();

    return new Map(
      rows.map((row) => [Number(row.userId), new Date(row.lastSeenAt)]),
    );
  }

  /**
   * Add whole days to a 'YYYY-MM-DD' string.
   *
   * The string is parsed as UTC midnight purely as a calendar vehicle - only
   * whole days are added and the result is formatted back as a date, so no
   * timezone conversion happens and DST cannot shift the answer.
   */
  private shiftDate(date: string, days: number): string {
    const parsed = new Date(`${date}T00:00:00Z`);
    parsed.setUTCDate(parsed.getUTCDate() + days);
    return parsed.toISOString().slice(0, 10);
  }
}
