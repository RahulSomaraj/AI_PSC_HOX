import { InternalServerErrorException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DashboardService } from './dashboard.service';
import { User } from '../users/entities/user.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Question } from '../questions/entities/question.entity';
import { Exam } from '../exam/entities/exam.entity';
import { Role } from '../common/enums/role.enum';
import { BatchStatus } from '../common/enums/batch-status.enum';

/** Chainable stub for the aggregate SELECT examAttempts() builds. */
function queryBuilder(rows: unknown[] = []) {
  const qb: any = {};
  for (const method of [
    'select',
    'addSelect',
    'where',
    'setParameter',
    'groupBy',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(rows);
  return qb;
}

function countingRepository<T>(count: number) {
  return {
    count: jest.fn().mockResolvedValue(count),
  } as unknown as Repository<T>;
}

function configWith(values: Record<string, string> = {}) {
  return { get: (key: string) => values[key] } as any;
}

type Deps = {
  users?: Repository<User>;
  batches?: Repository<Batch>;
  questions?: Partial<Repository<Question>>;
  exams?: Partial<Repository<Exam>>;
  subscriptions?: { countActive: jest.Mock };
  config?: Record<string, string>;
  activity?: {
    dailyActiveUsers?: jest.Mock;
    distinctActiveUsers?: jest.Mock;
  };
};

function build(deps: Deps = {}) {
  const subscriptions = deps.subscriptions ?? {
    countActive: jest.fn().mockResolvedValue({ activeSubscriptions: 0 }),
  };
  const service = new DashboardService(
    deps.users ?? countingRepository<User>(0),
    deps.batches ?? countingRepository<Batch>(0),
    (deps.questions ?? { find: jest.fn().mockResolvedValue([]) }) as any,
    (deps.exams ?? {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder()),
    }) as any,
    subscriptions as any,
    configWith(deps.config ?? {}),
    {
      dailyActiveUsers: jest.fn().mockResolvedValue([]),
      distinctActiveUsers: jest.fn().mockResolvedValue(0),
      ...deps.activity,
    } as any,
  );
  return { service, subscriptions };
}

describe('DashboardService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('summary', () => {
    it('counts live students, running batches and active subscriptions', async () => {
      const users = countingRepository<User>(1240);
      const batches = countingRepository<Batch>(18);
      const subscriptions = {
        countActive: jest.fn().mockResolvedValue({ activeSubscriptions: 842 }),
      };
      const { service } = build({ users, batches, subscriptions });

      await expect(service.summary()).resolves.toEqual({
        totalStudents: 1240,
        activeBatches: 18,
        activeSubscriptions: 842,
        todaysExams: 0,
      });
    });

    it('excludes soft-deleted users, which User does not do on its own', async () => {
      const users = countingRepository<User>(0);
      const { service } = build({ users });

      await service.summary();

      const where = (users.count as jest.Mock).mock.calls[0][0].where;
      expect(where.role).toBe(Role.User);
      // deletedAt is a plain nullable column, so the IsNull() must be present
      // or soft-deleted accounts inflate the tile.
      expect(where.deletedAt).toBeDefined();
    });

    it("treats both 'active' and 'ongoing' batches as running", async () => {
      const batches = countingRepository<Batch>(0);
      const { service } = build({ batches });

      await service.summary();

      const where = (batches.count as jest.Mock).mock.calls[0][0].where;
      expect(where.status._value).toEqual([
        BatchStatus.Active,
        BatchStatus.Ongoing,
      ]);
    });

    it('wraps a failing count in a 500 rather than leaking the driver error', async () => {
      const users = {
        count: jest.fn().mockRejectedValue(new Error('connection reset')),
      } as unknown as Repository<User>;
      const { service } = build({ users });

      await expect(service.summary()).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('recentQuestions', () => {
    it('returns newest first, excludes retired questions and honours the limit', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const { service } = build({ questions: { find } });

      await service.recentQuestions(5);

      expect(find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          relations: ['subject'],
          order: { createdAt: 'DESC', id: 'DESC' },
          take: 5,
        }),
      );
    });

    it('flattens the subject relation and tolerates an untagged question', async () => {
      const find = jest.fn().mockResolvedValue([
        {
          id: 1,
          question: 'Tagged?',
          difficulty: 3,
          subject: { id: 12, name: 'Indian Polity', description: 'ignored' },
          createdAt: new Date('2026-09-11T06:12:44.000Z'),
        },
        {
          id: 2,
          question: 'Untagged?',
          difficulty: 1,
          subject: null,
          createdAt: new Date('2026-09-10T06:12:44.000Z'),
        },
      ]);
      const { service } = build({ questions: { find } });

      const rows = await service.recentQuestions(5);

      expect(rows[0].subject).toBe('Indian Polity');
      expect(rows[1].subject).toBeNull();
    });

    it("answers in the console's RecentQuestion shape", async () => {
      const find = jest.fn().mockResolvedValue([
        {
          id: 1,
          question: 'Which article deals with equality?',
          difficulty: 3,
          subject: { id: 12, name: 'Indian Polity' },
          createdAt: new Date('2026-09-11T06:12:44.000Z'),
        },
      ]);
      const { service } = build({ questions: { find } });

      const [row] = await service.recentQuestions(5);

      expect(row).toEqual({
        id: 1,
        title: 'Which article deals with equality?',
        subject: 'Indian Polity',
        addedOn: '2026-09-11T06:12:44.000Z',
        difficulty: 3,
      });
    });
  });

  describe('examAttempts', () => {
    it('gap-fills quiet days and returns the series oldest first', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T00:30:00Z'));
      const qb = queryBuilder([
        { date: '2026-09-11', count: '63' },
        { date: '2026-09-09', count: '7' },
      ]);
      const { service } = build({
        exams: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        config: { ACTIVITY_TIMEZONE: 'UTC' },
      });

      await expect(service.examAttempts(3)).resolves.toEqual([
        { date: '2026-09-09', count: 7 },
        { date: '2026-09-10', count: 0 },
        { date: '2026-09-11', count: 63 },
      ]);
    });

    it('buckets by the activity timezone so the chart lines up with DAU', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-11T00:30:00Z'));
      const qb = queryBuilder([]);
      const { service } = build({
        exams: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        config: { ACTIVITY_TIMEZONE: 'Asia/Kolkata' },
      });

      const series = await service.examAttempts(1);

      expect(qb.setParameter).toHaveBeenCalledWith('tz', 'Asia/Kolkata');
      // 00:30 UTC is already the 11th in Kolkata.
      expect(series).toEqual([{ date: '2026-09-11', count: 0 }]);
      // The camelCase column must stay quoted or Postgres folds it.
      expect(qb.groupBy).toHaveBeenCalledWith(
        expect.stringContaining('"exam"."createdAt"'),
      );
    });

    it('defaults the timezone to Asia/Kolkata, matching ActivityService', async () => {
      const qb = queryBuilder([]);
      const { service } = build({
        exams: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
      });

      await service.examAttempts(1);

      expect(qb.setParameter).toHaveBeenCalledWith('tz', 'Asia/Kolkata');
    });
  });

  describe('chart series', () => {
    it('shapes exam attempts as { total, points } with weekday labels', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-16T00:30:00Z'));
      const qb = queryBuilder([
        { date: '2026-09-14', count: '4' },
        { date: '2026-09-16', count: '9' },
      ]);
      const { service } = build({
        exams: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        config: { ACTIVITY_TIMEZONE: 'UTC' },
      });

      await expect(service.examAttemptsSeries(3)).resolves.toEqual({
        total: 13,
        points: [
          { label: 'Mon', value: 4, date: '2026-09-14' },
          { label: 'Tue', value: 0, date: '2026-09-15' },
          { label: 'Wed', value: 9, date: '2026-09-16' },
        ],
      });
    });

    it('sums exam attempts, since each attempt is its own row', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-09-16T00:30:00Z'));
      const qb = queryBuilder([
        { date: '2026-09-15', count: '5' },
        { date: '2026-09-16', count: '5' },
      ]);
      const { service } = build({
        exams: { createQueryBuilder: jest.fn().mockReturnValue(qb) },
        config: { ACTIVITY_TIMEZONE: 'UTC' },
      });

      expect((await service.examAttemptsSeries(2)).total).toBe(10);
    });

    it('takes the DAU total from distinct students, not the sum of days', async () => {
      // 3 students Monday, 3 Tuesday - but the same 3. Summing would say 6.
      const dailyActiveUsers = jest.fn().mockResolvedValue([
        { date: '2026-09-14', count: 3 },
        { date: '2026-09-15', count: 3 },
      ]);
      const distinctActiveUsers = jest.fn().mockResolvedValue(3);
      const { service } = build({
        activity: { dailyActiveUsers, distinctActiveUsers },
      });

      const series = await service.dailyActiveSeries(2);

      expect(series.total).toBe(3);
      expect(series.points).toEqual([
        { label: 'Mon', value: 3, date: '2026-09-14' },
        { label: 'Tue', value: 3, date: '2026-09-15' },
      ]);
    });

    it('asks for students only, over the same window, for bars and total', async () => {
      const dailyActiveUsers = jest.fn().mockResolvedValue([]);
      const distinctActiveUsers = jest.fn().mockResolvedValue(0);
      const { service } = build({
        activity: { dailyActiveUsers, distinctActiveUsers },
      });

      await service.dailyActiveSeries(7);

      expect(dailyActiveUsers).toHaveBeenCalledWith(7, Role.User);
      expect(distinctActiveUsers).toHaveBeenCalledWith(7, Role.User);
    });

    it('wraps a failing DAU read in a 500', async () => {
      const { service } = build({
        activity: {
          dailyActiveUsers: jest.fn().mockRejectedValue(new Error('down')),
        },
      });

      await expect(service.dailyActiveSeries(7)).rejects.toBeInstanceOf(
        InternalServerErrorException,
      );
    });
  });

  describe('upcomingExams', () => {
    it('is empty until something can schedule an exam', async () => {
      const { service } = build();

      await expect(service.upcomingExams(5)).resolves.toEqual([]);
    });
  });
});
