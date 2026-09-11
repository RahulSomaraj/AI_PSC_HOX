import { Repository } from 'typeorm';
import { ExamAnalyticsService } from './exam-analytics.service';
import { Exam } from '../exam/entities/exam.entity';

/**
 * report() builds three queries in parallel - summary, total, page - so the
 * stub returns whatever each one asks for and keeps every builder.
 */
function build(opts: {
  summary?: Record<string, unknown>;
  total?: number;
  rows?: any[];
} = {}) {
  const builders: any[] = [];
  const summary = opts.summary ?? {
    totalAttempts: '0',
    completed: '0',
    averageScore: null,
    distinctStudents: '0',
  };

  const make = () => {
    const qb: any = { _selects: [] as string[] };
    for (const method of [
      'innerJoin',
      'where',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
    ]) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.select = jest.fn((expr: string, alias: string) => {
      qb._selects.push(alias ?? expr);
      return qb;
    });
    qb.addSelect = jest.fn((expr: string, alias: string) => {
      qb._selects.push(alias ?? expr);
      return qb;
    });
    // The total query selects a lone "count"; the summary selects several.
    qb.getRawOne = jest.fn().mockImplementation(() =>
      Promise.resolve(
        qb._selects.length === 1 ? { count: String(opts.total ?? 0) } : summary,
      ),
    );
    qb.getRawMany = jest.fn().mockResolvedValue(opts.rows ?? []);
    builders.push(qb);
    return qb;
  };

  const examRepository = {
    createQueryBuilder: jest.fn().mockImplementation(make),
  } as unknown as Repository<Exam>;

  return { service: new ExamAnalyticsService(examRepository), builders };
}

function row(over: Record<string, unknown> = {}) {
  return {
    courseId: 4,
    courseName: 'Kerala PSC LDC',
    attempts: '240',
    completed: '198',
    distinctStudents: '132',
    averageScore: '0.572',
    highestScore: '0.94',
    lowestScore: '0.125',
    attempted: '7200',
    correct: '4421',
    lastAttemptAt: new Date('2026-09-10T11:42:00.000Z'),
    ...over,
  };
}

describe('ExamAnalyticsService', () => {
  describe('summary', () => {
    it('derives abandoned and completion rate from the two counts', async () => {
      const { service } = build({
        summary: {
          totalAttempts: '1820',
          completed: '1544',
          averageScore: '0.572',
          distinctStudents: '612',
        },
      });

      const result = await service.report({});

      expect(result.summary).toEqual({
        totalAttempts: 1820,
        completed: 1544,
        abandoned: 276,
        completionRate: 84.8,
        averageScore: 57.2,
        distinctStudents: 612,
      });
    });

    it('reports null rates rather than dividing by zero on an empty database', async () => {
      const { service } = build();

      const result = await service.report({});

      expect(result.summary.completionRate).toBeNull();
      expect(result.summary.averageScore).toBeNull();
      expect(result.summary.abandoned).toBe(0);
    });
  });

  describe('rows', () => {
    it('converts every ratio to a percentage and derives accuracy', async () => {
      const { service } = build({ rows: [row()], total: 1 });

      const result = await service.report({});

      expect(result.items[0]).toEqual({
        courseId: 4,
        courseName: 'Kerala PSC LDC',
        attempts: 240,
        completed: 198,
        distinctStudents: 132,
        averageScore: 57.2,
        highestScore: 94,
        lowestScore: 12.5,
        accuracy: 61.4,
        lastAttemptAt: new Date('2026-09-10T11:42:00.000Z'),
      });
    });

    it('keeps nulls null for a course nobody has completed', async () => {
      const { service } = build({
        rows: [
          row({
            completed: '0',
            averageScore: null,
            highestScore: null,
            lowestScore: null,
            attempted: '0',
            correct: '0',
            lastAttemptAt: null,
          }),
        ],
        total: 1,
      });

      const result = await service.report({});

      expect(result.items[0].averageScore).toBeNull();
      expect(result.items[0].highestScore).toBeNull();
      expect(result.items[0].accuracy).toBeNull();
      expect(result.items[0].lastAttemptAt).toBeNull();
    });

    it('groups by course, not by catalogue stage', async () => {
      const { service, builders } = build();

      await service.report({});

      const grouped = builders.filter(
        (qb) => qb.groupBy.mock.calls.length > 0,
      );
      expect(grouped[0].groupBy).toHaveBeenCalledWith('exam."courseId"');
      // exam_stage_id is null on everything predating the catalogue link, so
      // grouping by it here would report on a sliver of the data.
      const allGroupBys = grouped
        .flatMap((qb) => qb.groupBy.mock.calls.map((c: any[]) => c[0]))
        .join(' ');
      expect(allGroupBys).not.toContain('exam_stage_id');
    });

    it('filters to one course only when asked', async () => {
      const filtered = build();
      await filtered.service.report({ courseId: 4 });
      expect(filtered.builders[0].where).toHaveBeenCalledWith(
        'exam."courseId" = :courseId',
        { courseId: 4 },
      );

      const unfiltered = build();
      await unfiltered.service.report({});
      expect(unfiltered.builders[0].where).not.toHaveBeenCalled();
    });

    it('pages and reports the page count', async () => {
      const { service, builders } = build({ total: 18 });

      const result = await service.report({ page: 2, limit: 10 });

      const paged = builders.find((qb) => qb.offset.mock.calls.length > 0);
      expect(paged.offset).toHaveBeenCalledWith(10);
      expect(paged.limit).toHaveBeenCalledWith(10);
      expect(result).toMatchObject({ total: 18, page: 2, totalPages: 2 });
    });
  });
});
