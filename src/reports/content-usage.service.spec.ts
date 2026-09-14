import { Repository } from 'typeorm';
import { ContentUsageService } from './content-usage.service';
import { ContentView } from '../content-views/entities/content-view.entity';

/**
 * report() fires six queries in parallel off six fresh builders, so the stub
 * routes each result by what the builder selected rather than by call order.
 */
function build(
  data: {
    summary?: Record<string, unknown>;
    series?: Array<{ date: string; views: string }>;
    bySubject?: any[];
    byBatch?: any[];
    total?: number;
    items?: any[];
  } = {},
  timeZone = 'UTC',
) {
  const builders: any[] = [];

  const make = () => {
    const qb: any = { _aliases: [] as string[] };
    for (const method of [
      'innerJoin',
      'leftJoin',
      'where',
      'andWhere',
      'setParameter',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
    ]) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    const remember = (expr: string, alias?: string) => {
      qb._aliases.push(alias ?? expr);
      return qb;
    };
    qb.select = jest.fn(remember);
    qb.addSelect = jest.fn(remember);

    qb.getRawOne = jest.fn().mockImplementation(() => {
      if (qb._aliases.includes('count')) {
        return Promise.resolve({ count: String(data.total ?? 0) });
      }
      return Promise.resolve(
        data.summary ?? {
          totalViews: '0',
          distinctViewers: '0',
          itemsViewed: '0',
        },
      );
    });

    qb.getRawMany = jest.fn().mockImplementation(() => {
      if (qb._aliases.includes('date')) return Promise.resolve(data.series ?? []);
      if (qb._aliases.includes('title')) return Promise.resolve(data.items ?? []);
      if (qb._aliases.includes('subjectId'))
        return Promise.resolve(data.bySubject ?? []);
      if (qb._aliases.includes('batchId'))
        return Promise.resolve(data.byBatch ?? []);
      return Promise.resolve([]);
    });

    builders.push(qb);
    return qb;
  };

  const viewRepository = {
    createQueryBuilder: jest.fn().mockImplementation(make),
  } as unknown as Repository<ContentView>;

  const service = new ContentUsageService(viewRepository, {
    get: () => timeZone,
  } as any);

  const withAlias = (alias: string) =>
    builders.find((qb) => qb._aliases.includes(alias));

  return { service, builders, withAlias };
}

describe('ContentUsageService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-14T00:30:00Z'));
  });

  describe('summary', () => {
    it('averages views over every day in the window, not just busy ones', async () => {
      const { service } = build({
        summary: {
          totalViews: '4820',
          distinctViewers: '412',
          itemsViewed: '148',
        },
      });

      const result = await service.report({ days: 30 });

      expect(result.summary).toEqual({
        totalViews: 4820,
        distinctViewers: 412,
        itemsViewed: 148,
        averageDailyViews: 160.7,
      });
    });

    it('reports zeros on an empty window without dividing by zero', async () => {
      const { service } = build();

      const result = await service.report({ days: 7 });

      expect(result.summary.totalViews).toBe(0);
      expect(result.summary.averageDailyViews).toBe(0);
    });
  });

  describe('series', () => {
    it('gap-fills quiet days and runs oldest first', async () => {
      const { service } = build({
        series: [
          { date: '2026-09-14', views: '163' },
          { date: '2026-09-12', views: '40' },
        ],
      });

      const result = await service.report({ days: 3 });

      expect(result.series).toEqual([
        { date: '2026-09-12', views: 40 },
        { date: '2026-09-13', views: 0 },
        { date: '2026-09-14', views: 163 },
      ]);
    });

    it('buckets by the activity timezone so the chart lines up with the others', async () => {
      const { service, withAlias } = build({}, 'Asia/Kolkata');

      await service.report({ days: 1 });

      expect(withAlias('date').setParameter).toHaveBeenCalledWith(
        'tz',
        'Asia/Kolkata',
      );
      expect(withAlias('date').groupBy).toHaveBeenCalledWith(
        expect.stringContaining('AT TIME ZONE'),
      );
    });
  });

  describe('breakdowns', () => {
    it('keeps the untagged subject bucket rather than dropping it', async () => {
      const { service } = build({
        bySubject: [
          {
            subjectId: 12,
            subjectName: 'Indian Polity',
            views: '1840',
            distinctViewers: '268',
          },
          {
            subjectId: null,
            subjectName: null,
            views: '96',
            distinctViewers: '31',
          },
        ],
      });

      const result = await service.report({});

      expect(result.bySubject[1]).toEqual({
        subjectId: null,
        subjectName: null,
        views: 96,
        distinctViewers: 31,
      });
    });

    it('keeps readers who were in no batch', async () => {
      const { service } = build({
        byBatch: [
          { batchId: null, batchName: null, views: '210', distinctViewers: '55' },
        ],
      });

      const result = await service.report({});

      expect(result.byBatch[0].batchId).toBeNull();
      expect(result.byBatch[0].views).toBe(210);
    });

    it('left joins the name tables so a retired subject still reports', async () => {
      const { service, withAlias } = build();

      await service.report({});

      const joined = withAlias('subjectId').leftJoin.mock.calls[0];
      expect(joined[0]).toBe('subjects');
      // No deleted_at filter: the id is denormalised and carries no FK.
      expect(joined[2]).not.toContain('deleted_at');
    });

    it('caps each breakdown at twenty rows', async () => {
      const { service, withAlias } = build();

      await service.report({});

      expect(withAlias('subjectId').limit).toHaveBeenCalledWith(20);
      expect(withAlias('batchId').limit).toHaveBeenCalledWith(20);
    });
  });

  describe('items', () => {
    it('maps a row and counts distinct viewers separately from views', async () => {
      const { service } = build({
        total: 148,
        items: [
          {
            contentId: 91,
            title: 'Indian Polity - Fundamental Rights notes',
            type: 'pdf',
            subjectId: 12,
            subjectName: 'Indian Polity',
            views: '340',
            distinctViewers: '212',
            lastViewedAt: new Date('2026-09-13T09:11:00.000Z'),
          },
        ],
      });

      const result = await service.report({});

      expect(result.items[0]).toEqual({
        contentId: 91,
        title: 'Indian Polity - Fundamental Rights notes',
        type: 'pdf',
        subjectId: 12,
        subjectName: 'Indian Polity',
        views: 340,
        distinctViewers: 212,
        lastViewedAt: new Date('2026-09-13T09:11:00.000Z'),
      });
      expect(result.total).toBe(148);
      expect(result.totalPages).toBe(6);
    });

    it('does not exclude soft-deleted items, which were still read', async () => {
      const { service, withAlias } = build();

      await service.report({});

      const joined = withAlias('title').innerJoin.mock.calls[0];
      expect(joined[0]).toBe('content');
      expect(joined[2]).not.toContain('deleted_at');
    });

    it('orders by views and breaks ties on id for stable pages', async () => {
      const { service, withAlias } = build();

      await service.report({ page: 3, limit: 25 });

      expect(withAlias('title').orderBy).toHaveBeenCalledWith(
        'COUNT(*)',
        'DESC',
      );
      expect(withAlias('title').addOrderBy).toHaveBeenCalledWith(
        'view.content_id',
        'ASC',
      );
      expect(withAlias('title').offset).toHaveBeenCalledWith(50);
    });
  });

  describe('filters', () => {
    it('filters on the denormalised ids, not on the live content row', async () => {
      const { service, builders } = build();

      await service.report({ subjectId: 12, batchId: 3 });

      const clauses = builders
        .flatMap((qb) => qb.andWhere.mock.calls.map((c: any[]) => c[0]))
        .join(' ');
      expect(clauses).toContain('view.subject_id = :subjectId');
      expect(clauses).toContain('view.batch_id = :batchId');
      // Not item.subject_id - that would report on where an item is filed
      // now, rather than where it was filed when it was read.
      expect(clauses).not.toContain('item.subject_id');
    });

    it('applies neither filter when neither is given', async () => {
      const { service, builders } = build();

      await service.report({});

      const clauses = builders
        .flatMap((qb) => qb.andWhere.mock.calls.map((c: any[]) => c[0]))
        .join(' ');
      expect(clauses).not.toContain('subjectId');
      expect(clauses).not.toContain('batchId');
    });
  });
});
