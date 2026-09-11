import { Repository } from 'typeorm';
import { ActivityService } from './activity.service';
import { UserActivity } from './entities/user-activity.entity';
import { Role } from '../common/enums/role.enum';

/**
 * Chainable stub covering both shapes the service builds: the INSERT ...
 * ON CONFLICT used by write(), and the aggregate SELECT used by the read
 * methods.
 */
function queryBuilder(rows: unknown[] = [], count = 0) {
  const qb: any = { execute: jest.fn().mockResolvedValue({}) };
  for (const method of [
    'insert',
    'into',
    'values',
    'orUpdate',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'innerJoin',
    'groupBy',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(rows);
  qb.getCount = jest.fn().mockResolvedValue(count);
  return qb;
}

function repositoryWith(qb: ReturnType<typeof queryBuilder>) {
  return {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  } as unknown as Repository<UserActivity>;
}

function configWith(values: Record<string, string> = {}) {
  return { get: (key: string) => values[key] } as any;
}

/**
 * Freeze the clock without faking setImmediate - the fire-and-forget write
 * is flushed through it, and a faked setImmediate would never fire.
 */
function freezeAt(iso: string) {
  jest.useFakeTimers({ doNotFake: ['setImmediate'] }).setSystemTime(
    new Date(iso),
  );
}

/** Lets the fire-and-forget write() settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ActivityService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('day bucketing', () => {
    // The reason activity_date is a date computed in app time rather than a
    // UTC timestamp. 19:30Z on the 10th is 01:00 IST on the 11th; bucketing
    // by UTC would file Indian late-evening activity under the wrong day and
    // skew both ends of the "Last 7 days" chart.
    beforeEach(() => {
      freezeAt('2026-09-10T19:30:00Z');
    });

    it('files 19:30Z under the next day in Asia/Kolkata', () => {
      const service = new ActivityService(
        repositoryWith(queryBuilder()),
        configWith(),
      );
      expect(service.today()).toBe('2026-09-11');
    });

    it('files the same instant under the current day in UTC', () => {
      const service = new ActivityService(
        repositoryWith(queryBuilder()),
        configWith({ ACTIVITY_TIMEZONE: 'UTC' }),
      );
      expect(service.today()).toBe('2026-09-10');
    });

    it('defaults to Asia/Kolkata when unconfigured', () => {
      const service = new ActivityService(
        repositoryWith(queryBuilder()),
        configWith(),
      );
      expect(service.today()).toBe('2026-09-11');
    });
  });

  describe('refresh window configuration', () => {
    const windowOf = (values: Record<string, string>) =>
      (
        new ActivityService(
          repositoryWith(queryBuilder()),
          configWith(values),
        ) as any
      ).refreshWindowMs;

    it('defaults to five minutes', () => {
      expect(windowOf({})).toBe(5 * 60_000);
    });

    it('honours a configured value', () => {
      expect(windowOf({ ACTIVITY_REFRESH_MINUTES: '15' })).toBe(15 * 60_000);
    });

    it.each(['abc', '0', '-3'])(
      'falls back to the default for %p rather than writing on every request',
      (value) => {
        expect(windowOf({ ACTIVITY_REFRESH_MINUTES: value })).toBe(5 * 60_000);
      },
    );
  });

  describe('recordActivity', () => {
    it('writes once and collapses repeats inside the refresh window', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      const service = new ActivityService(repositoryWith(qb), configWith());

      service.recordActivity(42);
      service.recordActivity(42);
      service.recordActivity(42);
      await flush();

      expect(qb.execute).toHaveBeenCalledTimes(1);
    });

    it('writes again once the window has elapsed', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      const service = new ActivityService(repositoryWith(qb), configWith());

      service.recordActivity(42);
      await flush();

      jest.setSystemTime(new Date('2026-09-11T06:06:00Z'));
      service.recordActivity(42);
      await flush();

      expect(qb.execute).toHaveBeenCalledTimes(2);
    });

    it('tracks users independently', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      const service = new ActivityService(repositoryWith(qb), configWith());

      service.recordActivity(1);
      service.recordActivity(2);
      await flush();

      expect(qb.execute).toHaveBeenCalledTimes(2);
    });

    it('writes again after the day rolls over, and clears its cache', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      const service = new ActivityService(repositoryWith(qb), configWith());

      service.recordActivity(42);
      await flush();

      // Next IST day, still inside the five-minute refresh window.
      jest.setSystemTime(new Date('2026-09-11T18:31:00Z'));
      service.recordActivity(42);
      await flush();

      expect(qb.execute).toHaveBeenCalledTimes(2);
      expect((service as any).lastWriteByUser.size).toBe(1);
    });

    it('overwrites only last_seen_at, keeping first_seen_at intact', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      const service = new ActivityService(repositoryWith(qb), configWith());

      service.recordActivity(42);
      await flush();

      expect(qb.orUpdate).toHaveBeenCalledWith(
        ['last_seen_at'],
        ['user_id', 'activity_date'],
      );
      expect(qb.values).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 42, activityDate: '2026-09-11' }),
      );
    });

    it('never lets a write failure escape into the request', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      qb.execute.mockRejectedValue(new Error('connection lost'));
      const service = new ActivityService(repositoryWith(qb), configWith());

      expect(() => service.recordActivity(42)).not.toThrow();
      await flush();
    });

    it('releases its claim after a failure so the next request retries', async () => {
      freezeAt('2026-09-11T06:00:00Z');
      const qb = queryBuilder();
      qb.execute.mockRejectedValueOnce(new Error('connection lost'));
      const service = new ActivityService(repositoryWith(qb), configWith());

      service.recordActivity(42);
      await flush();

      // Still inside the window: without the claim being released this
      // would be skipped and the user would go unrecorded for five minutes.
      service.recordActivity(42);
      await flush();

      expect(qb.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe('dailyActiveUsers', () => {
    it('gap-fills, orders oldest first and returns numeric counts', async () => {
      const qb = queryBuilder([
        { date: '2026-09-09', count: '12' },
        { date: '2026-09-11', count: '7' },
      ]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-09-11');

      await expect(service.dailyActiveUsers(4)).resolves.toEqual([
        { date: '2026-09-08', count: 0 },
        { date: '2026-09-09', count: 12 },
        { date: '2026-09-10', count: 0 },
        { date: '2026-09-11', count: 7 },
      ]);
    });

    it('returns a full zero series when nobody was active', async () => {
      const qb = queryBuilder([]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-09-11');

      await expect(service.dailyActiveUsers(3)).resolves.toEqual([
        { date: '2026-09-09', count: 0 },
        { date: '2026-09-10', count: 0 },
        { date: '2026-09-11', count: 0 },
      ]);
    });

    it('spans month and year boundaries correctly', async () => {
      const qb = queryBuilder([]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-01-02');

      const series = await service.dailyActiveUsers(4);
      expect(series.map((point) => point.date)).toEqual([
        '2025-12-30',
        '2025-12-31',
        '2026-01-01',
        '2026-01-02',
      ]);
    });

    it('covers the leap day', async () => {
      const qb = queryBuilder([]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2024-03-01');

      const series = await service.dailyActiveUsers(2);
      expect(series.map((point) => point.date)).toEqual([
        '2024-02-29',
        '2024-03-01',
      ]);
    });

    it.each([0, -5, NaN])('falls back to seven days for %p', async (days) => {
      const qb = queryBuilder([]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-09-11');

      await expect(service.dailyActiveUsers(days)).resolves.toHaveLength(7);
    });

    it('joins users and excludes soft-deleted ones when filtering by role', async () => {
      const qb = queryBuilder([]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-09-11');

      await service.dailyActiveUsers(7, Role.User);

      expect(qb.innerJoin).toHaveBeenCalled();
      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', {
        role: Role.User,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('user.deletedAt IS NULL');
    });

    it('does not join users when no role filter is given', async () => {
      const qb = queryBuilder([]);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-09-11');

      await service.dailyActiveUsers(7);

      expect(qb.innerJoin).not.toHaveBeenCalled();
    });
  });

  describe('countForDate', () => {
    it('defaults to today', async () => {
      const qb = queryBuilder([], 31);
      const service = new ActivityService(repositoryWith(qb), configWith());
      jest.spyOn(service, 'today').mockReturnValue('2026-09-11');

      await expect(service.countForDate()).resolves.toBe(31);
      expect(qb.where).toHaveBeenCalledWith(
        'activity.activity_date = :target',
        { target: '2026-09-11' },
      );
    });
  });

  describe('lastSeenForUsers', () => {
    it('short-circuits on an empty list without querying', async () => {
      const repository = repositoryWith(queryBuilder());
      const service = new ActivityService(repository, configWith());

      await expect(service.lastSeenForUsers([])).resolves.toEqual(new Map());
      expect(repository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('maps user ids to their most recent activity', async () => {
      const seen = new Date('2026-09-11T06:00:00Z');
      const qb = queryBuilder([{ userId: '7', lastSeenAt: seen }]);
      const service = new ActivityService(repositoryWith(qb), configWith());

      const result = await service.lastSeenForUsers([7, 9]);

      // Keyed by number even though the driver reports the id as a string.
      expect(result.get(7)).toEqual(seen);
      expect(result.has(9)).toBe(false);
    });
  });
});
