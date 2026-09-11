import { Repository } from 'typeorm';
import { StudentPerformanceService } from './student-performance.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import {
  SortOrder,
  StudentPerformanceSortBy,
} from './dto/student-performance-query.dto';

function build(rows: any[] = [], total = rows.length) {
  const builders: any[] = [];

  const make = () => {
    const qb: any = {};
    for (const method of [
      'leftJoin',
      'select',
      'addSelect',
      'where',
      'andWhere',
      'orderBy',
      'addOrderBy',
      'offset',
      'limit',
    ]) {
      qb[method] = jest.fn().mockReturnValue(qb);
    }
    qb.getCount = jest.fn().mockResolvedValue(total);
    qb.getRawMany = jest.fn().mockResolvedValue(rows);
    builders.push(qb);
    return qb;
  };

  const userRepository = {
    createQueryBuilder: jest.fn().mockImplementation(make),
  } as unknown as Repository<User>;

  const service = new StudentPerformanceService(userRepository);
  // The count builder is first; the page builder second.
  return { service, builders, page: () => builders[1] };
}

function row(over: Record<string, unknown> = {}) {
  return {
    userId: 42,
    firstName: 'Anjali',
    lastName: 'Menon',
    email: 'anjali@example.com',
    batchId: 3,
    batchName: 'LDC Evening 2026',
    examsTaken: '12',
    averageScore: '0.584',
    attempted: '430',
    correct: '268',
    lastActiveOn: '2026-09-10',
    ...over,
  };
}

describe('StudentPerformanceService', () => {
  describe('report', () => {
    it('maps a row and converts both ratios to percentages', async () => {
      const { service } = build([row()]);

      const result = await service.report({});

      expect(result.items[0]).toEqual({
        userId: 42,
        studentName: 'Anjali Menon',
        email: 'anjali@example.com',
        batchId: 3,
        batchName: 'LDC Evening 2026',
        examsTaken: 12,
        averageScore: 58.4,
        attempted: 430,
        correct: 268,
        accuracy: 62.3,
        lastActiveOn: '2026-09-10',
      });
    });

    it('reports nulls for a student who has done nothing, rather than zero', async () => {
      const { service } = build([
        row({
          examsTaken: '0',
          averageScore: null,
          attempted: '0',
          correct: '0',
          lastActiveOn: null,
          batchId: null,
          batchName: null,
        }),
      ]);

      const result = await service.report({});

      // Zero attempts is not zero accuracy - there is nothing to average.
      expect(result.items[0].accuracy).toBeNull();
      expect(result.items[0].averageScore).toBeNull();
      expect(result.items[0].lastActiveOn).toBeNull();
      expect(result.items[0].batchName).toBeNull();
      expect(result.items[0].examsTaken).toBe(0);
    });

    it('counts only live students', async () => {
      const { service, page } = build();

      await service.report({});

      expect(page().where).toHaveBeenCalledWith('student.role = :role', {
        role: Role.User,
      });
      expect(page().andWhere).toHaveBeenCalledWith(
        'student."deletedAt" IS NULL',
      );
    });

    it('left joins the batch so unplaced students are not dropped', async () => {
      const { service, page } = build();

      await service.report({});

      const joins = page().leftJoin.mock.calls.map((call: any[]) => call[0]);
      expect(joins).toEqual(['aspirant_profiles', 'batches']);
    });

    it('filters by batch only when asked', async () => {
      const filtered = build();
      await filtered.service.report({ batchId: 3 });
      expect(filtered.page().andWhere).toHaveBeenCalledWith(
        'profile.batch_id = :batchId',
        { batchId: 3 },
      );

      const unfiltered = build();
      await unfiltered.service.report({});
      const clauses = unfiltered
        .page()
        .andWhere.mock.calls.map((call: any[]) => call[0]);
      expect(clauses.join(' ')).not.toContain('profile.batch_id');
    });

    it('searches name and email case-insensitively', async () => {
      const { service, page } = build();

      await service.report({ search: 'anjali' });

      const call = page().andWhere.mock.calls.find((c: any[]) =>
        String(c[0]).includes('ILIKE'),
      );
      expect(call[1]).toEqual({ search: '%anjali%' });
    });

    it('defaults to accuracy descending and sorts unrankable students last', async () => {
      const { service, page } = build();

      await service.report({});

      expect(page().orderBy).toHaveBeenCalledWith(
        expect.stringContaining('is_correct'),
        SortOrder.Desc,
        'NULLS LAST',
      );
      expect(page().addOrderBy).toHaveBeenCalledWith('student.id', 'ASC');
    });

    it('sorts by name when asked', async () => {
      const { service, page } = build();

      await service.report({
        sortBy: StudentPerformanceSortBy.Name,
        sortOrder: SortOrder.Asc,
      });

      expect(page().orderBy).toHaveBeenCalledWith(
        'student."firstName"',
        SortOrder.Asc,
        'NULLS LAST',
      );
    });

    it('pages with offset and limit and reports the page count', async () => {
      const { service, page } = build([], 1240);

      const result = await service.report({ page: 3, limit: 25 });

      expect(page().offset).toHaveBeenCalledWith(50);
      expect(page().limit).toHaveBeenCalledWith(25);
      expect(result).toMatchObject({
        total: 1240,
        page: 3,
        limit: 25,
        totalPages: 50,
      });
    });
  });
});
