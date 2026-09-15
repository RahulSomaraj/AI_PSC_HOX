import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StudentAnalyticsService } from './student-analytics.service';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';

/** Chainable stub for the grouped rollup the service builds. */
function queryBuilder(rows: unknown[] = []) {
  const qb: any = {};
  for (const method of [
    'innerJoin',
    'select',
    'addSelect',
    'where',
    'andWhere',
    'groupBy',
    'addGroupBy',
    'having',
    'orderBy',
    'addOrderBy',
    'limit',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getRawMany = jest.fn().mockResolvedValue(rows);
  return qb;
}

function build(rows: unknown[] = [], studentExists = true) {
  const qb = queryBuilder(rows);
  const answerLogRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  } as unknown as Repository<AnswerLog>;
  const userRepository = {
    exists: jest.fn().mockResolvedValue(studentExists),
  } as unknown as Repository<User>;
  const service = new StudentAnalyticsService(
    answerLogRepository,
    userRepository,
  );
  return { service, qb, userRepository };
}

describe('StudentAnalyticsService', () => {
  describe('weakSubjects', () => {
    it('derives accuracy from the two counts it reports', async () => {
      const { service } = build([
        {
          subjectId: 12,
          subjectName: 'Indian Polity',
          attempted: '48',
          correct: '19',
        },
      ]);

      await expect(service.weakSubjects(1, 5, 5)).resolves.toEqual([
        {
          subjectId: 12,
          subjectName: 'Indian Polity',
          attempted: 48,
          correct: 19,
          incorrect: 29,
          accuracy: 39.6,
          name: 'Indian Polity',
          percentage: 39.6,
        },
      ]);
    });

    it("carries the console's WeakSubject names beside the fuller ones", async () => {
      const { service } = build([
        {
          subjectId: 7,
          subjectName: 'Geography',
          attempted: '8',
          correct: '7',
        },
      ]);

      const [row] = await service.weakSubjects(1, 5, 1);

      // The three fields the console's WeakSubject type reads.
      expect({
        subjectId: row.subjectId,
        name: row.name,
        percentage: row.percentage,
      }).toEqual({ subjectId: 7, name: 'Geography', percentage: 87.5 });
      // Same numbers under both names - they cannot drift apart.
      expect(row.percentage).toBe(row.accuracy);
      expect(row.name).toBe(row.subjectName);
    });

    it('rounds accuracy to one decimal place', async () => {
      const { service } = build([
        { subjectId: 1, subjectName: 'A', attempted: '3', correct: '1' },
        { subjectId: 2, subjectName: 'B', attempted: '8', correct: '7' },
      ]);

      const rows = await service.weakSubjects(1, 5, 1);

      expect(rows[0].accuracy).toBe(33.3);
      expect(rows[1].accuracy).toBe(87.5);
    });

    it('reports a perfect and a zero subject without NaN', async () => {
      const { service } = build([
        { subjectId: 1, subjectName: 'Zero', attempted: '6', correct: '0' },
        { subjectId: 2, subjectName: 'Perfect', attempted: '6', correct: '6' },
      ]);

      const rows = await service.weakSubjects(1, 5, 1);

      expect(rows[0].accuracy).toBe(0);
      expect(rows[1].accuracy).toBe(100);
    });

    it('orders weakest first, breaking ties towards more evidence', async () => {
      const { service, qb } = build();

      await service.weakSubjects(1, 5, 5);

      expect(qb.orderBy).toHaveBeenCalledWith(
        expect.stringContaining('::float'),
        'ASC',
      );
      expect(qb.addOrderBy).toHaveBeenNthCalledWith(1, 'COUNT(*)', 'DESC');
      expect(qb.addOrderBy).toHaveBeenNthCalledWith(2, 'log.subject_id', 'ASC');
    });

    it('applies the noise floor as a HAVING on the attempt count', async () => {
      const { service, qb } = build();

      await service.weakSubjects(1, 5, 10);

      expect(qb.having).toHaveBeenCalledWith('COUNT(*) >= :minAttempts', {
        minAttempts: 10,
      });
    });

    it('scopes to the student and drops untagged answers', async () => {
      const { service, qb } = build();

      await service.weakSubjects(42, 5, 5);

      expect(qb.where).toHaveBeenCalledWith('log.user_id = :userId', {
        userId: 42,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('log.subject_id IS NOT NULL');
      expect(qb.limit).toHaveBeenCalledWith(5);
    });

    it('counts practice and exam answers together', async () => {
      const { service, qb } = build();

      await service.weakSubjects(1, 5, 5);

      // No exam_id filter: a subject you keep getting wrong in practice is
      // still a weakness.
      const clauses = qb.andWhere.mock.calls.map((call: any[]) => call[0]);
      expect(clauses.join(' ')).not.toContain('exam_id');
    });

    it('applies no date window, because answeredAt is insert time for backfilled rows', async () => {
      const { service, qb } = build();

      await service.weakSubjects(1, 5, 5);

      const clauses = [
        ...qb.where.mock.calls.map((call: any[]) => call[0]),
        ...qb.andWhere.mock.calls.map((call: any[]) => call[0]),
      ];
      expect(clauses.join(' ')).not.toContain('answered_at');
    });

    it('returns an empty list for a student who has answered nothing', async () => {
      const { service } = build([]);

      await expect(service.weakSubjects(1, 5, 5)).resolves.toEqual([]);
    });

    it('404s for an unknown, soft-deleted or non-student account', async () => {
      const { service, userRepository } = build([], false);

      await expect(service.weakSubjects(99, 5, 5)).rejects.toBeInstanceOf(
        NotFoundException,
      );

      const where = (userRepository.exists as jest.Mock).mock.calls[0][0].where;
      expect(where.id).toBe(99);
      expect(where.role).toBe(Role.User);
      // deletedAt is a plain nullable column on User, so the IsNull() matters.
      expect(where.deletedAt).toBeDefined();
    });

    it('does not query the answer log when the student does not exist', async () => {
      const { service, qb } = build([], false);

      await expect(service.weakSubjects(99, 5, 5)).rejects.toThrow();

      expect(qb.getRawMany).not.toHaveBeenCalled();
    });
  });
});
