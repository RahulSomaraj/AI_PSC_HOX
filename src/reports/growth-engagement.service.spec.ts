import { Repository } from 'typeorm';
import { GrowthEngagementService } from './growth-engagement.service';
import { User } from '../users/entities/user.entity';

/**
 * Every read goes through repository.query(), so the stub routes each call
 * by what the SQL mentions rather than by call order - report() issues them
 * all in parallel and the order is not guaranteed.
 */
function build(
  data: {
    signups?: Array<{ date: string; count: string }>;
    active?: Array<{ date: string; count: string }>;
    subscriptions?: Array<{ date: string; count: string }>;
    attempts?: Array<{ date: string; count: string }>;
    distinct?: string;
    returning?: { existing: string; returned: string };
  } = {},
  timeZone = 'UTC',
) {
  const calls: string[] = [];

  const query = jest.fn((sql: string) => {
    calls.push(sql);
    if (sql.includes('COUNT(DISTINCT a.user_id)')) {
      return Promise.resolve([{ count: data.distinct ?? '0' }]);
    }
    if (sql.includes('AS existing')) {
      return Promise.resolve([
        data.returning ?? { existing: '0', returned: '0' },
      ]);
    }
    if (sql.includes('FROM user_activity a')) {
      return Promise.resolve(data.active ?? []);
    }
    if (sql.includes('FROM users t')) {
      return Promise.resolve(data.signups ?? []);
    }
    if (sql.includes('FROM subscriptions t')) {
      return Promise.resolve(data.subscriptions ?? []);
    }
    if (sql.includes('FROM exams t')) {
      return Promise.resolve(data.attempts ?? []);
    }
    return Promise.resolve([]);
  });

  const userRepository = { query } as unknown as Repository<User>;
  const config = { get: () => timeZone } as any;

  return {
    service: new GrowthEngagementService(userRepository, config),
    query,
    calls,
  };
}

describe('GrowthEngagementService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-11T00:30:00Z'));
  });

  describe('series', () => {
    it('gap-fills quiet days and returns the window oldest first', async () => {
      const { service } = build({
        signups: [{ date: '2026-09-11', count: '14' }],
        attempts: [{ date: '2026-09-09', count: '63' }],
      });

      const result = await service.report(3);

      expect(result.series).toEqual([
        {
          date: '2026-09-09',
          signups: 0,
          activeUsers: 0,
          newSubscriptions: 0,
          examAttempts: 63,
        },
        {
          date: '2026-09-10',
          signups: 0,
          activeUsers: 0,
          newSubscriptions: 0,
          examAttempts: 0,
        },
        {
          date: '2026-09-11',
          signups: 14,
          activeUsers: 0,
          newSubscriptions: 0,
          examAttempts: 0,
        },
      ]);
    });

    it('keeps the four series on their own keys', async () => {
      const { service } = build({
        signups: [{ date: '2026-09-11', count: '1' }],
        active: [{ date: '2026-09-11', count: '2' }],
        subscriptions: [{ date: '2026-09-11', count: '3' }],
        attempts: [{ date: '2026-09-11', count: '4' }],
      });

      const result = await service.report(1);

      expect(result.series[0]).toEqual({
        date: '2026-09-11',
        signups: 1,
        activeUsers: 2,
        newSubscriptions: 3,
        examAttempts: 4,
      });
    });
  });

  describe('summary', () => {
    it('sums the daily series but takes distinct actives from its own query', async () => {
      const { service } = build({
        signups: [
          { date: '2026-09-10', count: '5' },
          { date: '2026-09-11', count: '9' },
        ],
        active: [
          { date: '2026-09-10', count: '100' },
          { date: '2026-09-11', count: '120' },
        ],
        distinct: '150',
      });

      const result = await service.report(2);

      expect(result.summary.signups).toBe(14);
      // 100 + 120 would double-count anyone seen on both days.
      expect(result.summary.activeUsers).toBe(150);
      expect(result.summary.averageDailyActive).toBe(110);
    });

    it('averages daily actives over the whole window, including empty days', async () => {
      const { service } = build({
        active: [{ date: '2026-09-11', count: '100' }],
      });

      const result = await service.report(4);

      // 100 over four days, not over the one day that had activity.
      expect(result.summary.averageDailyActive).toBe(25);
    });

    it('computes the returning rate against students who predate the window', async () => {
      const { service } = build({
        returning: { existing: '500', returned: '171' },
      });

      const result = await service.report(30);

      expect(result.summary.returningRate).toBe(34.2);
    });

    it('reports a null returning rate when nobody predates the window', async () => {
      const { service } = build({ returning: { existing: '0', returned: '0' } });

      const result = await service.report(30);

      expect(result.summary.returningRate).toBeNull();
    });
  });

  describe('bucketing', () => {
    it('buckets timestamp columns by the activity timezone', async () => {
      const { service, query } = build({}, 'Asia/Kolkata');

      await service.report(1);

      const signupCall = query.mock.calls.find((call) =>
        String(call[0]).includes('FROM users t'),
      );
      expect(signupCall[0]).toContain('AT TIME ZONE');
      expect(signupCall[1][0]).toBe('Asia/Kolkata');
    });

    it('does not re-convert user_activity, which is already a local date', async () => {
      const { service, query } = build();

      await service.report(1);

      const activeCall = query.mock.calls.find(
        (call) =>
          String(call[0]).includes('FROM user_activity a') &&
          String(call[0]).includes('GROUP BY'),
      );
      expect(activeCall[0]).not.toContain('AT TIME ZONE');
    });

    it('excludes soft-deleted rows on the tables that need it', async () => {
      const { service, query } = build();

      await service.report(1);

      const sql = query.mock.calls.map((call) => String(call[0])).join(' ');
      // subscriptions.deletedAt is a plain column, not a @DeleteDateColumn.
      expect(sql).toContain('FROM subscriptions t');
      const subs = query.mock.calls.find((call) =>
        String(call[0]).includes('FROM subscriptions t'),
      );
      expect(subs[0]).toContain('"deletedAt" IS NULL');
    });
  });
});
