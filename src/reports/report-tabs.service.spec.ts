import { InternalServerErrorException } from '@nestjs/common';
import { ReportTabsService } from './report-tabs.service';

/**
 * Answers each query by what its SQL contains, so the tests do not depend on
 * the order the service issues them in. Every matcher must be specific enough
 * to hit exactly one of the queries a method runs.
 */
function database(routes: Array<[RegExp, unknown[]]>) {
  return {
    query: jest.fn((sql: string) => {
      const route = routes.find(([pattern]) => pattern.test(sql));
      if (!route) throw new Error(`No canned rows for SQL:\n${sql}`);
      return Promise.resolve(route[1]);
    }),
  };
}

const config = { get: () => 'UTC' } as any;
const DAY = 86_400_000;
const isoDay = (offset: number) =>
  new Date(Date.now() + offset * DAY).toISOString().slice(0, 10);

describe('ReportTabsService', () => {
  describe('studentPerformance', () => {
    const routes = (over: Array<[RegExp, unknown[]]> = []) =>
      database([
        ...over,
        [/COUNT\(DISTINCT a\.user_id\)/, [{ count: '412' }]],
        [/AVG\(.*WHERE e\."status" = 'completed'$/s, [{ average: '0.728' }]],
        [/SELECT COUNT\(\*\) AS count FROM exams e$/, [{ count: '1840' }]],
        [
          /FROM answer_log l/,
          [
            { subject: 'Geography', attempted: '8', correct: '7' },
            { subject: 'Indian Polity', attempted: '3', correct: '1' },
          ],
        ],
        [
          /FROM batches b/,
          [{ batch: 'Alpha', startDate: isoDay(-10), endDate: isoDay(10) }],
        ],
        [/AT TIME ZONE/, [{ date: isoDay(0), count: '5' }]],
      ]);

    it("answers in the console's StudentPerformanceReport shape", async () => {
      const service = new ReportTabsService(routes() as any, config);

      const report = await service.studentPerformance();

      expect(Object.keys(report).sort()).toEqual([
        'averageAccuracy',
        'batchCompletion',
        'summary',
        'weakSubjects',
        'weeklySignups',
      ]);
      expect(report.summary).toEqual({
        activeStudents: 412,
        averageExamScore: 72.8,
        examsAttempted: 1840,
        newSignups: 5,
      });
    });

    it('keeps two decimals on the average exam score', async () => {
      const service = new ReportTabsService(
        routes([
          [
            /AVG\(.*WHERE e\."status" = 'completed'$/s,
            [{ average: '0.72846' }],
          ],
        ]) as any,
        config,
      );

      expect(
        (await service.studentPerformance()).summary.averageExamScore,
      ).toBe(72.85);
    });

    it('reports subject accuracy whole, unsorted by weakness, in both lists', async () => {
      const service = new ReportTabsService(routes() as any, config);

      const report = await service.studentPerformance();

      // Name order from SQL, not weakest first - the card sorts (Q66).
      expect(report.weakSubjects).toEqual([
        { subject: 'Geography', percentage: 87.5 },
        { subject: 'Indian Polity', percentage: 33.3 },
      ]);
      expect(report.averageAccuracy).toEqual(report.weakSubjects);
    });

    it('measures batch completion by how much of the schedule has passed', async () => {
      const service = new ReportTabsService(routes() as any, config);

      expect((await service.studentPerformance()).batchCompletion).toEqual([
        { batch: 'Alpha', percentage: 50 },
      ]);
    });

    it.each([
      ['not started', 0, 5, 15],
      ['finished', 100, -30, -1],
    ])('reports a %s batch as %i%%', async (_state, expected, from, to) => {
      const service = new ReportTabsService(
        routes([
          [
            /FROM batches b/,
            [{ batch: 'B', startDate: isoDay(from), endDate: isoDay(to) }],
          ],
        ]) as any,
        config,
      );

      expect(
        (await service.studentPerformance()).batchCompletion[0].percentage,
      ).toBe(expected);
    });

    it('gap-fills seven days of sign-ups with weekday labels, oldest first', async () => {
      const service = new ReportTabsService(routes() as any, config);

      const { weeklySignups } = await service.studentPerformance();

      expect(weeklySignups).toHaveLength(7);
      expect(weeklySignups.map((p) => p.value)).toEqual([0, 0, 0, 0, 0, 0, 5]);
      expect(weeklySignups[0].label).toMatch(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/);
    });

    it('reports 0, not NaN, before any exam is completed', async () => {
      const service = new ReportTabsService(
        routes([
          [/AVG\(.*WHERE e\."status" = 'completed'$/s, [{ average: null }]],
        ]) as any,
        config,
      );

      expect(
        (await service.studentPerformance()).summary.averageExamScore,
      ).toBe(0);
    });
  });

  describe('examAnalytics', () => {
    const routes = (over: Array<[RegExp, unknown[]]> = []) =>
      database([
        ...over,
        [
          /GROUP BY p\.id, p\.name/,
          [
            {
              examId: 1,
              examName: 'LDC',
              average: '0.6',
              highest: '0.8',
              lowest: '0.4',
            },
            {
              examId: 2,
              examName: 'KAS',
              average: '0.5',
              highest: '0.5',
              lowest: '0.5',
            },
          ],
        ],
        [
          /WITH attempted AS/,
          [
            { examId: 1, attempted: '2', eligible: '3' },
            { examId: 2, attempted: '1', eligible: '1' },
          ],
        ],
        [/exam_stage_id IS NULL/, [{ count: '920' }]],
        [/FROM exam_posts p WHERE p\.deleted_at IS NULL$/, [{ count: '24' }]],
        [
          /AVG\(.*JOIN exam_stages st.*WHERE e\."status" = 'completed'$/s,
          [{ average: '0.55' }],
        ],
      ]);

    it("answers in the console's ExamAnalyticsReport shape", async () => {
      const service = new ReportTabsService(routes() as any, config);

      await expect(service.examAnalytics()).resolves.toEqual({
        summary: {
          mockTests: 920,
          totalExams: 24,
          averageParticipation: 83.4,
          averageScore: 55,
        },
        rows: [
          {
            examId: 1,
            examName: 'LDC',
            averageScore: 60,
            highestScore: 80,
            lowestScore: 40,
            participationRate: 66.7,
          },
          {
            examId: 2,
            examName: 'KAS',
            averageScore: 50,
            highestScore: 50,
            lowestScore: 50,
            participationRate: 100,
          },
        ],
      });
    });

    it('counts a student who sat an unassigned exam on both sides of participation', async () => {
      const db = routes();
      const service = new ReportTabsService(db as any, config);

      await service.examAnalytics();

      const sql = db.query.mock.calls
        .map((call: string[]) => call[0])
        .find((text: string) => text.includes('WITH attempted AS'));
      expect(sql).toMatch(
        /eligible AS \(\s*SELECT exam_id, user_id FROM assigned\s*UNION\s*SELECT exam_id, user_id FROM attempted/,
      );
    });

    it('averages participation as 0 when there are no rows', async () => {
      const service = new ReportTabsService(
        routes([
          [/GROUP BY p\.id, p\.name/, []],
          [/WITH attempted AS/, []],
        ]) as any,
        config,
      );

      const report = await service.examAnalytics();

      expect(report.rows).toEqual([]);
      expect(report.summary.averageParticipation).toBe(0);
    });
  });

  describe('contentUsage', () => {
    it("answers in the console's ContentUsageReport shape", async () => {
      const service = new ReportTabsService(
        database([
          [
            /FROM content c/,
            [
              {
                contentId: 1,
                title: 'Polity Notes',
                type: 'pdf',
                subject: 'Indian Polity',
                views: '3',
              },
              {
                contentId: 2,
                title: 'Untagged',
                type: 'links',
                subject: null,
                views: '0',
              },
            ],
          ],
        ]) as any,
        config,
      );

      await expect(service.contentUsage()).resolves.toEqual({
        summary: {
          contentItems: 2,
          mostViewedTitle: 'Polity Notes',
          totalViews: 3,
          averageCompletion: 0,
        },
        rows: [
          {
            contentId: 1,
            title: 'Polity Notes',
            type: 'pdf',
            subject: 'Indian Polity',
            views: 3,
            completionRate: 0,
          },
          {
            contentId: 2,
            title: 'Untagged',
            type: 'links',
            subject: null,
            views: 0,
            completionRate: 0,
          },
        ],
      });
    });

    it('names no most-viewed item before anything has been opened', async () => {
      const service = new ReportTabsService(
        database([
          [
            /FROM content c/,
            [
              {
                contentId: 1,
                title: 'A',
                type: 'pdf',
                subject: null,
                views: '0',
              },
            ],
          ],
        ]) as any,
        config,
      );

      expect((await service.contentUsage()).summary.mostViewedTitle).toBeNull();
    });
  });

  describe('engagement', () => {
    it("answers in the console's EngagementReport shape, in ranking order", async () => {
      const db = database([
        [
          /FROM user_activity a/,
          [
            {
              studentId: 1,
              firstName: 'Anjali',
              lastName: 'Menon',
              batch: 'Alpha',
              lastActiveAt: new Date('2026-09-15T08:00:00.000Z'),
            },
            {
              studentId: 2,
              firstName: 'Rahul',
              lastName: 'Nair',
              batch: null,
              lastActiveAt: '2026-09-14T10:00:00.000Z',
            },
          ],
        ],
      ]);
      const service = new ReportTabsService(db as any, config);

      await expect(service.engagement()).resolves.toEqual({
        rows: [
          {
            studentId: 1,
            name: 'Anjali Menon',
            batch: 'Alpha',
            lastActiveAt: '2026-09-15T08:00:00.000Z',
          },
          {
            studentId: 2,
            name: 'Rahul Nair',
            batch: null,
            lastActiveAt: '2026-09-14T10:00:00.000Z',
          },
        ],
      });
    });

    it('ranks by days active, then recency, and caps at 50 students', async () => {
      const db = database([[/FROM user_activity a/, []]]);
      const service = new ReportTabsService(db as any, config);

      await service.engagement();

      const [sql, params] = db.query.mock.calls[0];
      expect(sql).toMatch(
        /ORDER BY COUNT\(DISTINCT a\.activity_date\) DESC,\s*MAX\(a\.last_seen_at\) DESC/,
      );
      expect(params[3]).toBe(50);
    });
  });

  it('answers 500, not a driver error, when a query fails', async () => {
    const service = new ReportTabsService(
      {
        query: jest.fn().mockRejectedValue(new Error('relation missing')),
      } as any,
      config,
    );
    jest.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(service.contentUsage()).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
