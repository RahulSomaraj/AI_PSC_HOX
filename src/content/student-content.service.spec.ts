import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { StudentContentService } from './student-content.service';
import { ContentType } from './content-type.enum';
import { Role } from '../common/enums/role.enum';

const queryBuilderMock = () => {
  const calls: Record<string, any[]> = {};
  const qb: any = {};
  for (const method of [
    'innerJoin',
    'select',
    'where',
    'orderBy',
    'addOrderBy',
    'limit',
  ]) {
    qb[method] = jest.fn((...args: any[]) => {
      (calls[method] ??= []).push(args);
      return qb;
    });
  }
  qb.calls = calls;
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
};

describe('StudentContentService', () => {
  let views: any;
  let users: any;
  let qb: any;
  let service: StudentContentService;

  beforeEach(() => {
    qb = queryBuilderMock();
    views = { createQueryBuilder: jest.fn(() => qb) };
    users = { exists: jest.fn().mockResolvedValue(true) };
    service = new StudentContentService(views, users);
  });

  it('returns the P2-6 shape, with an ISO timestamp', async () => {
    qb.getRawMany.mockResolvedValue([
      {
        id: 12,
        title: 'Fundamental Rights notes',
        kind: ContentType.Pdf,
        viewedAt: new Date('2026-09-12T04:00:00.000Z'),
      },
    ]);

    expect(await service.recentContent(42)).toEqual([
      {
        id: 12,
        title: 'Fundamental Rights notes',
        kind: 'pdf',
        viewedAt: '2026-09-12T04:00:00.000Z',
      },
    ]);
  });

  it('returns the content id, not the view id', async () => {
    qb.getRawMany.mockResolvedValue([]);

    await service.recentContent(42);

    const selected = qb.calls.select[0][0].join(' ');
    expect(selected).toContain('content.id AS "id"');
    expect(selected).not.toContain('view.id AS "id"');
  });

  it('reads only that student, newest first', async () => {
    await service.recentContent(42);

    expect(qb.where).toHaveBeenCalledWith('view.user_id = :userId', {
      userId: 42,
    });
    expect(qb.orderBy).toHaveBeenCalledWith('view.viewed_at', 'DESC');
  });

  it('defaults to five and honours a limit', async () => {
    await service.recentContent(42);
    expect(qb.limit).toHaveBeenCalledWith(5);

    await service.recentContent(42, 20);
    expect(qb.limit).toHaveBeenCalledWith(20);
  });

  it('drops opens whose item has since been deleted', async () => {
    await service.recentContent(42);

    expect(qb.innerJoin).toHaveBeenCalledWith(
      'view.content',
      'content',
      'content.deleted_at IS NULL',
    );
  });

  it('does not filter by status - the panel is history, not visibility', async () => {
    await service.recentContent(42);

    const clauses = JSON.stringify(qb.calls);
    expect(clauses).not.toContain('status');
  });

  describe('who counts as a student', () => {
    it('404s an id that is not a live student account', async () => {
      users.exists.mockResolvedValue(false);

      await expect(service.recentContent(42)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(views.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('applies the same rule as the Weak Subjects panel beside it', async () => {
      await service.recentContent(42);

      expect(users.exists).toHaveBeenCalledWith({
        where: { id: 42, role: Role.User, deletedAt: IsNull() },
      });
    });

    it('is 200 with an empty list for a student who has opened nothing', async () => {
      qb.getRawMany.mockResolvedValue([]);

      await expect(service.recentContent(42)).resolves.toEqual([]);
    });
  });
});
