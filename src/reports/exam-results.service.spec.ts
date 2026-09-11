import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ExamResultsService } from './exam-results.service';
import { Exam } from '../exam/entities/exam.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';

/**
 * The service builds the query twice - once as a COUNT, once as the page -
 * so the stub hands out a fresh builder per createQueryBuilder call and
 * keeps them all for inspection.
 */
function build(rows: any[] = [], total = rows.length, postExists = true) {
  const builders: any[] = [];

  const make = () => {
    const qb: any = {};
    for (const method of [
      'innerJoin',
      'leftJoin',
      'select',
      'addSelect',
      'where',
      'andWhere',
      'groupBy',
      'addGroupBy',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
    ]) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getRawOne = jest.fn().mockResolvedValue({ count: String(total) });
    qb.getRawMany = jest.fn().mockResolvedValue(rows);
    builders.push(qb);
    return qb;
  };

  const examRepository = {
    createQueryBuilder: jest.fn().mockImplementation(make),
  } as unknown as Repository<Exam>;
  const examPostRepository = {
    exists: jest.fn().mockResolvedValue(postExists),
  } as unknown as Repository<ExamPost>;

  const service = new ExamResultsService(examRepository, examPostRepository);
  // The page query is the second builder; the first counted.
  return { service, builders, page: () => builders[1], examPostRepository };
}

function row(over: Partial<Record<string, unknown>> = {}) {
  return {
    attemptId: 913,
    userId: 42,
    firstName: 'Anjali',
    lastName: 'Menon',
    email: 'anjali@example.com',
    stageId: 3,
    stageName: 'Prelims',
    score: 184,
    totalPossibleScore: 300,
    completedAt: new Date('2026-09-10T11:42:00.000Z'),
    attempted: '30',
    correct: '19',
    ...over,
  };
}

describe('ExamResultsService', () => {
  describe('forExamPost', () => {
    it('maps a row and derives percentage to one decimal', async () => {
      const { service } = build([row()]);

      const result = await service.forExamPost(1, undefined, 1, 25);

      expect(result.items[0]).toEqual({
        rank: 1,
        attemptId: 913,
        userId: 42,
        studentName: 'Anjali Menon',
        email: 'anjali@example.com',
        stageId: 3,
        stageName: 'Prelims',
        score: 184,
        totalPossibleScore: 300,
        percentage: 61.3,
        attempted: 30,
        correct: 19,
        incorrect: 11,
        completedAt: new Date('2026-09-10T11:42:00.000Z'),
      });
    });

    it('gives equal percentages the same rank and skips the next', async () => {
      const { service } = build([
        row({ attemptId: 1, score: 300 }),
        row({ attemptId: 2, score: 150 }),
        row({ attemptId: 3, score: 150 }),
        row({ attemptId: 4, score: 90 }),
      ]);

      const result = await service.forExamPost(1, undefined, 1, 25);

      expect(result.items.map((item) => item.rank)).toEqual([1, 2, 2, 4]);
    });

    it('continues the ranking across pages rather than restarting at 1', async () => {
      const { service } = build([row({ attemptId: 9, score: 60 })], 40);

      const result = await service.forExamPost(1, undefined, 3, 10);

      expect(result.items[0].rank).toBe(21);
    });

    it('reports a null percentage when there is no total to divide by', async () => {
      const { service } = build([
        row({ totalPossibleScore: null }),
        row({ attemptId: 2, totalPossibleScore: 0 }),
        row({ attemptId: 3, score: null }),
      ]);

      const result = await service.forExamPost(1, undefined, 1, 25);

      expect(result.items.map((item) => item.percentage)).toEqual([
        null,
        null,
        null,
      ]);
    });

    it('restricts to completed attempts that named a stage', async () => {
      const { service, page } = build();

      await service.forExamPost(7, undefined, 1, 25);

      // The inner join on exam_stage_id is what excludes practice attempts.
      const joins = page().innerJoin.mock.calls.map((call: any[]) => call[2]);
      expect(joins[0]).toContain('exam.exam_stage_id');
      expect(page().andWhere).toHaveBeenCalledWith(
        expect.stringContaining("'completed'"),
      );
      expect(page().where).toHaveBeenCalledWith(
        'stage.exam_id = :examPostId',
        { examPostId: 7 },
      );
    });

    it('narrows to one stage only when asked', async () => {
      const withStage = build();
      await withStage.service.forExamPost(7, 3, 1, 25);
      expect(withStage.page().andWhere).toHaveBeenCalledWith(
        'stage.id = :stageId',
        { stageId: 3 },
      );

      const without = build();
      await without.service.forExamPost(7, undefined, 1, 25);
      const clauses = without
        .page()
        .andWhere.mock.calls.map((call: any[]) => call[0]);
      expect(clauses.join(' ')).not.toContain('stage.id = :stageId');
    });

    it('sorts unrankable attempts last instead of first', async () => {
      const { service, page } = build();

      await service.forExamPost(1, undefined, 1, 25);

      expect(page().orderBy).toHaveBeenCalledWith(
        expect.stringContaining('NULLIF'),
        'DESC',
        'NULLS LAST',
      );
    });

    it('pages with offset and limit and reports the page count', async () => {
      const { service, page } = build([], 128);

      const result = await service.forExamPost(1, undefined, 3, 25);

      expect(page().offset).toHaveBeenCalledWith(50);
      expect(page().limit).toHaveBeenCalledWith(25);
      expect(result).toMatchObject({
        total: 128,
        page: 3,
        limit: 25,
        totalPages: 6,
      });
    });

    it('returns an empty roster when no attempt has been linked yet', async () => {
      const { service } = build([], 0);

      const result = await service.forExamPost(1, undefined, 1, 25);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('404s for an unknown or soft-deleted exam post', async () => {
      const { service } = build([], 0, false);

      await expect(
        service.forExamPost(99, undefined, 1, 25),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
