// Existing Subject/Batch files contain committed merge markers. Mock only those
// external entity classes; the faculty entity and service are exercised below.
jest.mock('../subjects/entities/subject.entity', () => ({
  Subject: class Subject {},
}));
jest.mock('../batches/entities/batch.entity', () => ({
  Batch: class Batch {},
}));
// Contributions counts rows in both; neither entity's shape matters here.
jest.mock('../questions/entities/question.entity', () => ({
  Question: class Question {},
}));
jest.mock('../content/entities/content.entity', () => ({
  Content: class Content {},
}));

import { ConflictException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as argon2 from 'argon2';
import { FacultyService } from './faculty.service';
import { Faculty } from './entities/faculty.entity';
import { User } from '../users/entities/user.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Question } from '../questions/entities/question.entity';
import { Content } from '../content/entities/content.entity';
import { ContentStatus } from '../content/content-type.enum';
import { QuestionStatus } from '../questions/question-fields.enum';
import { UserSession } from '../auth/entities/user-session.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { FacultyRole } from './faculty-role.enum';
import { Role } from '../common/enums/role.enum';
import { FindFacultyQueryDto } from './dto/find-faculty-query.dto';

function queryBuilder() {
  const qb: any = {};
  for (const method of [
    'innerJoinAndSelect',
    'leftJoinAndSelect',
    'where',
    'andWhere',
    'innerJoin',
    'leftJoin',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'select',
    'addSelect',
    'groupBy',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getManyAndCount = jest.fn();
  qb.getMany = jest.fn();
  qb.getOne = jest.fn();
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue(undefined);
  return qb;
}

describe('FacultyService', () => {
  let service: FacultyService;
  let repos: Map<unknown, any>;
  let source: any;
  let qb: any;
  let sessions: any;
  let record: any;
  const input = {
    firstName: 'Omari',
    lastName: 'Everett',
    email: 'Omari@example.com',
    phone: '9876543210',
    password: 'SecurePass123!',
    subjectId: 1,
    role: FacultyRole.Teacher,
    batchIds: [3, 4],
  };

  beforeEach(() => {
    qb = queryBuilder();
    sessions = queryBuilder();
    record = {
      id: 10,
      userId: 20,
      subjectId: 1,
      role: FacultyRole.Teacher,
      user: {
        id: 20,
        firstName: 'Omari',
        lastName: 'Everett',
        email: 'omari@example.com',
        phone: '9876543210',
        isActive: true,
        passwordHash: 'secret',
        role: Role.Staff,
      },
      subject: { id: 1, name: 'Physics' },
      batches: [
        { id: 3, name: 'Batch A' },
        { id: 4, name: 'Batch B' },
      ],
    };
    repos = new Map();
    for (const entity of [
      Faculty,
      User,
      Subject,
      Batch,
      UserSession,
      PasswordResetToken,
      Question,
      Content,
    ]) {
      repos.set(entity, {
        create: jest.fn((value) => ({ ...value })),
        save: jest.fn(async (value) => ({
          id: entity === User ? 20 : 10,
          ...value,
        })),
        existsBy: jest.fn().mockResolvedValue(entity === Subject),
        countBy: jest.fn().mockResolvedValue(2),
        findOne: jest
          .fn()
          .mockResolvedValue(
            entity === Faculty
              ? { id: 10, userId: 20, subjectId: 1, role: FacultyRole.Teacher }
              : { ...record.user },
          ),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        find: jest.fn().mockResolvedValue([]),
        createQueryBuilder: jest
          .fn()
          .mockReturnValue(entity === UserSession ? sessions : qb),
      });
    }
    qb.getOne.mockResolvedValue(record);
    qb.getManyAndCount.mockResolvedValue([[record], 1]);
    qb.getMany.mockResolvedValue([record]);
    const manager = { getRepository: (entity: unknown) => repos.get(entity) };
    source = {
      manager,
      getRepository: manager.getRepository,
      transaction: jest.fn(async (work) => work(manager)),
    };
    service = new FacultyService(source as DataSource);
  });

  it('creates an account and assignments inside one transaction, hashes the password and returns safe fields', async () => {
    const result = await service.create(input, 7);
    expect(source.transaction).toHaveBeenCalledTimes(1);
    const savedUser = repos.get(User).save.mock.calls[0][0];
    expect(savedUser).toMatchObject({
      email: 'omari@example.com',
      role: Role.Staff,
      isActive: true,
      createdBy: 7,
    });
    expect(await argon2.verify(savedUser.passwordHash, input.password)).toBe(
      true,
    );
    expect(savedUser).not.toHaveProperty('password');
    expect(repos.get(Faculty).save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 20,
        batches: [{ id: 3 }, { id: 4 }],
        role: FacultyRole.Teacher,
        createdBy: 7,
      }),
    );
    expect(result).toMatchObject({
      name: 'Omari Everett',
      assignedBatches: record.batches,
      lastLogin: null,
    });
    expect(result).not.toHaveProperty('passwordHash');
    expect(result).not.toHaveProperty('user');
  });

  it('rejects duplicate emails before writing an account', async () => {
    repos.get(User).existsBy.mockResolvedValue(true);
    await expect(service.create(input, 7)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(repos.get(User).save).not.toHaveBeenCalled();
  });

  it('translates a concurrent email uniqueness violation into 409', async () => {
    repos.get(User).save.mockRejectedValue({ code: '23505' });
    await expect(
      service.update(10, { email: 'used@example.com' }, 7),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['subject', 'batch'])(
    'rejects missing or deleted %s assignments before account creation',
    async (kind) => {
      if (kind === 'subject')
        repos.get(Subject).existsBy.mockResolvedValue(false);
      else repos.get(Batch).countBy.mockResolvedValue(1);
      await expect(service.create(input, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repos.get(User).save).not.toHaveBeenCalled();
    },
  );

  it('supports unassigned faculty', async () => {
    await service.create({ ...input, batchIds: [] }, 7);
    expect(repos.get(Batch).countBy).not.toHaveBeenCalled();
    expect(repos.get(Faculty).save).toHaveBeenCalledWith(
      expect.objectContaining({ batches: [] }),
    );
  });

  it('keeps all batches while filtering, applies false status, and paginates distinct faculty', async () => {
    qb.getManyAndCount.mockResolvedValue([[record], 24]);
    const result = await service.findAll({
      ...new FindFacultyQueryDto(),
      page: 2,
      batchId: 3,
      subjectId: 1,
      role: FacultyRole.Teacher,
      isActive: false,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('user.isActive = :isActive', {
      isActive: false,
    });
    expect(qb.innerJoin).toHaveBeenCalledWith(
      'faculty.batches',
      'filterBatch',
      expect.any(String),
      { batchId: 3 },
    );
    expect(qb.skip).toHaveBeenCalledWith(10);
    expect(qb.take).toHaveBeenCalledWith(10);
    expect(result).toMatchObject({
      total: 24,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
    expect((result as any).data[0].assignedBatches).toHaveLength(2);
  });

  it('parameterizes name/exam search and escapes wildcard characters', async () => {
    await service.findAll({
      ...new FindFacultyQueryDto(),
      search: "50%_O'Reilly",
    });
    expect(qb.leftJoin).toHaveBeenCalledWith(
      'searchBatch.exam',
      'searchExam',
      expect.any(String),
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      expect.stringContaining('searchExam.name ILIKE :search'),
      { search: "%50\\%\\_O'Reilly%" },
    );
  });

  it('returns last login from session history without exposing session tokens', async () => {
    sessions.getRawMany.mockResolvedValue([
      { userId: '20', lastLogin: '2026-09-10T08:00:00Z' },
    ]);
    const result = await service.findOne(10);
    expect(result.lastLogin).toBe('2026-09-10T08:00:00Z');
    expect(sessions.addSelect).toHaveBeenCalledWith(
      'MAX(session.createdAt)',
      'lastLogin',
    );
    expect(result).not.toHaveProperty('refreshToken');
  });

  describe("the console's FacultyMember fields", () => {
    it('lists subject and batch names as plain strings', async () => {
      const result = await service.findOne(10);

      expect(result.subjects).toEqual(['Physics']);
      // Name-sorted, the same order as assignedBatches.
      expect(result.batches).toEqual(['Batch A', 'Batch B']);
    });

    it('keeps the id-carrying fields beside them', async () => {
      const result = await service.findOne(10);

      expect(result.subject).toEqual({ id: 1, name: 'Physics' });
      expect(result.assignedBatches.map((b) => b.id)).toEqual([3, 4]);
    });

    it('gives an unassigned member empty lists, never null', async () => {
      qb.getOne.mockResolvedValue({ ...record, subject: null, batches: [] });

      const result = await service.findOne(10);

      expect(result.subjects).toEqual([]);
      expect(result.batches).toEqual([]);
    });

    it('reports lastLoginAt as an ISO timestamp', async () => {
      sessions.getRawMany.mockResolvedValue([
        { userId: '20', lastLogin: '2026-09-10T08:00:00Z' },
      ]);

      const result = await service.findOne(10);

      expect(result.lastLoginAt).toBe('2026-09-10T08:00:00.000Z');
    });

    it('reports a member who never logged in as null', async () => {
      sessions.getRawMany.mockResolvedValue([]);

      expect((await service.findOne(10)).lastLoginAt).toBeNull();
    });
  });

  describe('paging is opt-in', () => {
    it('returns a plain array when no page is asked for - what the console reads', async () => {
      const result = await service.findAll(new FindFacultyQueryDto());

      expect(Array.isArray(result)).toBe(true);
      expect((result as any[])[0].name).toBe('Omari Everett');
      expect(qb.skip).not.toHaveBeenCalled();
      expect(qb.getManyAndCount).not.toHaveBeenCalled();
    });

    it('returns an empty array, not an envelope, for no matches', async () => {
      qb.getMany.mockResolvedValue([]);

      expect(await service.findAll(new FindFacultyQueryDto())).toEqual([]);
      expect(sessions.getRawMany).not.toHaveBeenCalled();
    });

    it('returns a valid empty page under data when a page is asked for', async () => {
      qb.getManyAndCount.mockResolvedValue([[], 0]);

      expect(
        await service.findAll({ ...new FindFacultyQueryDto(), page: 1 }),
      ).toEqual({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      });
    });
  });

  it('returns 404 for missing/deleted records', async () => {
    qb.getOne.mockResolvedValue(null);
    await expect(service.findOne(999)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    repos.get(Faculty).findOne.mockResolvedValue(null);
    await expect(
      service.update(999, { firstName: 'Changed' }, 7),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove(999, 7)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('clears assignments explicitly and keeps job role separate from account permissions', async () => {
    await service.update(10, { batchIds: [], role: FacultyRole.Reviewer }, 7);
    expect(repos.get(Faculty).save).toHaveBeenCalledWith(
      expect.objectContaining({
        batches: [],
        role: FacultyRole.Reviewer,
        updatedBy: 7,
      }),
    );
    expect(repos.get(User).save).toHaveBeenCalledWith(
      expect.objectContaining({ role: Role.Staff }),
    );
  });

  it('preserves assignments when batchIds is omitted', async () => {
    await service.update(10, { firstName: 'Changed' }, 7);
    expect(repos.get(Faculty).save.mock.calls[0][0]).not.toHaveProperty(
      'batches',
    );
  });

  it('rejects an empty update', async () => {
    await expect(service.update(10, {}, 7)).rejects.toThrow(
      'Provide at least one field',
    );
    expect(source.transaction).not.toHaveBeenCalled();
  });

  it('deactivates the account and revokes sessions in the same transaction', async () => {
    await service.setStatus(10, false, 7);
    expect(repos.get(User).save).toHaveBeenCalledWith(
      expect.objectContaining({ isActive: false, updatedBy: 7 }),
    );
    expect(repos.get(UserSession).update).toHaveBeenCalledWith(
      { user: { id: 20 }, revoked: false },
      { revoked: true },
    );
  });

  it('soft-deletes both records with audit actors and invalidates authentication state', async () => {
    await service.remove(10, 7);
    expect(source.transaction).toHaveBeenCalledTimes(1);
    expect(repos.get(Faculty).update).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 7 }),
    );
    expect(repos.get(User).update).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        deletedAt: expect.any(Date),
        deletedBy: 7,
        isActive: false,
      }),
    );
    expect(repos.get(UserSession).update).toHaveBeenCalled();
    expect(repos.get(PasswordResetToken).update).toHaveBeenCalledWith(
      { userId: 20, isUsed: false },
      { isUsed: true },
    );
  });

  it('propagates assignment write failures so the transaction can roll back the account', async () => {
    repos
      .get(Faculty)
      .save.mockRejectedValue(new Error('database unavailable'));
    await expect(service.create(input, 7)).rejects.toThrow(
      'database unavailable',
    );
    expect(qb.getOne).not.toHaveBeenCalled();
  });

  describe('contributions', () => {
    /**
     * Seeds the reads `contributions` issues, in order: four counts, the
     * difficulty average, then the recent questions and content.
     */
    const authored = ({
      questionsCreated = 0,
      questionsPublished = 0,
      contentUploads = 0,
      contentPublished = 0,
      averageDifficulty = null as string | null,
      recentQuestions = [] as unknown[],
      recentContent = [] as unknown[],
    } = {}) => {
      repos
        .get(Question)
        .countBy.mockResolvedValueOnce(questionsCreated)
        .mockResolvedValueOnce(questionsPublished);
      repos
        .get(Content)
        .countBy.mockResolvedValueOnce(contentUploads)
        .mockResolvedValueOnce(contentPublished);
      qb.getRawOne.mockResolvedValueOnce({ average: averageDifficulty });
      repos.get(Question).find.mockResolvedValueOnce(recentQuestions);
      repos.get(Content).find.mockResolvedValueOnce(recentContent);
    };

    it("answers in the console's FacultyContributions shape", async () => {
      authored({
        questionsCreated: 40,
        questionsPublished: 36,
        contentUploads: 10,
        contentPublished: 9,
        averageDifficulty: '3.6',
      });

      const result = await service.contributions(10);

      expect(result).toEqual({
        facultyId: 10,
        userId: 20,
        stats: {
          questionsCreated: 40,
          contentUploads: 10,
          avgDifficulty: 7.2,
          approvalRate: 90,
        },
        recent: [],
      });
    });

    it('keys off the staff account, not the faculty row id', async () => {
      authored();

      await service.contributions(10);

      // record.userId is 20; the faculty row is 10. Audit columns carry 20.
      expect(repos.get(Question).countBy).toHaveBeenCalledWith({
        createdBy: 20,
      });
      expect(repos.get(Content).countBy).toHaveBeenCalledWith({
        createdBy: 20,
      });
    });

    describe('avgDifficulty', () => {
      it('doubles the 1-5 average onto the 10-point scale the tile prints', async () => {
        authored({ questionsCreated: 3, averageDifficulty: '2.3333' });

        expect((await service.contributions(10)).stats.avgDifficulty).toBe(4.7);
      });

      it('is 0 for someone with no questions, not NaN', async () => {
        authored({ averageDifficulty: null });

        expect((await service.contributions(10)).stats.avgDifficulty).toBe(0);
      });
    });

    describe('approvalRate', () => {
      it('counts published over everything authored, both kinds together', async () => {
        authored({
          questionsCreated: 3,
          questionsPublished: 1,
          contentUploads: 1,
          contentPublished: 1,
        });

        // 2 published of 4 authored.
        expect((await service.contributions(10)).stats.approvalRate).toBe(50);
      });

      it('asks for published questions and published content', async () => {
        authored();

        await service.contributions(10);

        expect(repos.get(Question).countBy).toHaveBeenCalledWith({
          createdBy: 20,
          status: QuestionStatus.Published,
        });
        expect(repos.get(Content).countBy).toHaveBeenCalledWith({
          createdBy: 20,
          status: ContentStatus.Published,
        });
      });

      it('is 0 for someone who has authored nothing, not NaN', async () => {
        authored();

        expect((await service.contributions(10)).stats.approvalRate).toBe(0);
      });
    });

    describe('recent', () => {
      it('merges both kinds newest first and cuts to the limit', async () => {
        authored({
          recentQuestions: [
            {
              id: 5,
              question: '<p>Newest question</p>',
              status: QuestionStatus.Published,
              createdAt: new Date('2026-09-15T10:00:00.000Z'),
            },
            {
              id: 4,
              question: '<p>Oldest question</p>',
              status: QuestionStatus.Draft,
              createdAt: new Date('2026-09-01T10:00:00.000Z'),
            },
          ],
          recentContent: [
            {
              id: 9,
              title: 'Middle content',
              status: ContentStatus.Draft,
              createdAt: new Date('2026-09-10T10:00:00.000Z'),
            },
          ],
        });

        const { recent } = await service.contributions(10, 2);

        expect(recent).toEqual([
          {
            id: 5,
            title: 'Newest question',
            type: 'question',
            date: '2026-09-15T10:00:00.000Z',
            status: 'approved',
          },
          {
            id: 9,
            title: 'Middle content',
            type: 'content',
            date: '2026-09-10T10:00:00.000Z',
            status: 'pending',
          },
        ]);
      });

      it('fetches no more than the limit of each kind', async () => {
        authored();

        await service.contributions(10, 3);

        expect(repos.get(Question).find).toHaveBeenCalledWith(
          expect.objectContaining({ take: 3 }),
        );
        expect(repos.get(Content).find).toHaveBeenCalledWith(
          expect.objectContaining({ take: 3 }),
        );
      });

      it('reduces question HTML to plain words', async () => {
        authored({
          recentQuestions: [
            {
              id: 1,
              question:
                '<p>Which <strong>article</strong> covers&nbsp;equality &amp; liberty?</p>',
              status: QuestionStatus.PendingReview,
              createdAt: new Date('2026-09-15T10:00:00.000Z'),
            },
          ],
        });

        const [item] = (await service.contributions(10)).recent;

        expect(item.title).toBe('Which article covers equality & liberty?');
        // pending-review is not yet approved.
        expect(item.status).toBe('pending');
      });
    });

    it('404s a faculty member who is gone, without counting anything', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.contributions(10)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(repos.get(Question).countBy).not.toHaveBeenCalled();
    });
  });

  it('provides dropdown labels matching the staff screen', async () => {
    const result = await service.options();
    expect(result.roles.map((role) => role.label)).toEqual([
      'Teacher',
      'Reviewer',
      'Content Creator',
    ]);
    expect(result.statuses).toEqual([
      { value: true, label: 'Active' },
      { value: false, label: 'Inactive' },
    ]);
  });
});
