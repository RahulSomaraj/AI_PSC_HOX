import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentService, Viewer } from './content.service';
import { ContentStatus, ContentType } from './content-type.enum';

/** Records the WHERE fragments a query builder was given. */
const queryBuilderMock = () => {
  const wheres: string[] = [];
  const params: Record<string, unknown> = {};
  const qb: any = {
    wheres,
    params,
    leftJoinAndSelect: jest.fn(() => qb),
    where: jest.fn((clause: string, p?: object) => {
      wheres.push(clause);
      Object.assign(params, p ?? {});
      return qb;
    }),
    andWhere: jest.fn((clause: string, p?: object) => {
      wheres.push(clause);
      Object.assign(params, p ?? {});
      return qb;
    }),
    orderBy: jest.fn(() => qb),
    addOrderBy: jest.fn(() => qb),
    skip: jest.fn(() => qb),
    take: jest.fn(() => qb),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    getOne: jest.fn().mockResolvedValue(null),
  };
  return qb;
};

const STAFF: Viewer = { userId: 7, isStaff: true };
const STUDENT: Viewer = { userId: 42, isStaff: false };

describe('ContentService', () => {
  let content: any;
  let batches: any;
  let subjects: any;
  let topics: any;
  let subtopics: any;
  let examLevels: any;
  let profiles: any;
  let views: any;
  let qb: any;
  let service: ContentService;

  const valid = {
    title: 'Fundamental Rights',
    type: ContentType.Pdf,
    fileUrl: 'https://bucket.s3.ap-south-1.amazonaws.com/content/a.pdf',
    subjectId: 1,
  };

  beforeEach(() => {
    qb = queryBuilderMock();
    content = {
      create: jest.fn((input) => input),
      save: jest.fn((row) => Promise.resolve({ ...row, id: 99 })),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      createQueryBuilder: jest.fn(() => qb),
    };
    batches = { countBy: jest.fn().mockResolvedValue(0) };
    subjects = { existsBy: jest.fn().mockResolvedValue(true) };
    topics = { findOne: jest.fn() };
    subtopics = { findOne: jest.fn() };
    examLevels = { existsBy: jest.fn().mockResolvedValue(true) };
    profiles = { findOne: jest.fn().mockResolvedValue(null) };
    views = { record: jest.fn().mockResolvedValue(undefined) };

    service = new ContentService(
      content,
      batches,
      subjects,
      topics,
      subtopics,
      examLevels,
      profiles,
      views,
    );
    // create() and update() re-read the row; give them one.
    qb.getOne.mockResolvedValue({
      id: 99,
      title: valid.title,
      batches: [],
      subjectId: 1,
      subject: { id: 1, name: 'Polity' },
      createdAt: new Date('2026-09-12T04:00:00.000Z'),
    });
  });

  describe('source', () => {
    it('rejects an item that points at nothing', async () => {
      await expect(
        service.create({ ...valid, fileUrl: undefined } as any, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an item that points at two things', async () => {
      await expect(
        service.create(
          { ...valid, linkUrl: 'https://youtube.com/watch?v=x' } as any,
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts an external link with no uploaded file', async () => {
      await service.create(
        {
          ...valid,
          fileUrl: undefined,
          linkUrl: 'https://youtube.com/watch?v=x',
        } as any,
        7,
      );

      expect(content.save).toHaveBeenCalledWith(
        expect.objectContaining({
          fileUrl: null,
          linkUrl: 'https://youtube.com/watch?v=x',
        }),
      );
    });
  });

  describe('taxonomy', () => {
    it('rejects a subtopic with no topic', async () => {
      await expect(
        service.create({ ...valid, subtopicId: 5 } as any, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s an unknown subject', async () => {
      subjects.existsBy.mockResolvedValue(false);

      await expect(service.create(valid as any, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('rejects a topic belonging to a different subject', async () => {
      topics.findOne.mockResolvedValue({ id: 5, subjectId: 2 });

      await expect(
        service.create({ ...valid, subjectId: 1, topicId: 5 } as any, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects a subtopic belonging to a different topic', async () => {
      topics.findOne.mockResolvedValue({ id: 5, subjectId: 1 });
      subtopics.findOne.mockResolvedValue({ id: 9, topicId: 6 });

      await expect(
        service.create(
          { ...valid, subjectId: 1, topicId: 5, subtopicId: 9 } as any,
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('validates the merged row on update, not just the body', async () => {
      // Stored topic 5 is under subject 1; the PATCH moves the item to
      // subject 2 and says nothing about the topic. Nothing in the body is
      // wrong on its own.
      content.findOne.mockResolvedValue({
        id: 99,
        subjectId: 1,
        topicId: 5,
        subtopicId: null,
        fileUrl: valid.fileUrl,
        linkUrl: null,
        batches: [],
      });
      topics.findOne.mockResolvedValue({ id: 5, subjectId: 1 });

      await expect(
        service.update(99, { subjectId: 2 } as any, 7),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(content.save).not.toHaveBeenCalled();
    });
  });

  describe('batches', () => {
    it('defaults to no batches, meaning every student', async () => {
      await service.create(valid as any, 7);

      expect(batches.countBy).not.toHaveBeenCalled();
      expect(content.save).toHaveBeenCalledWith(
        expect.objectContaining({ batches: [] }),
      );
    });

    it('attaches several batches at once', async () => {
      batches.countBy.mockResolvedValue(2);

      await service.create({ ...valid, batchIds: [1, 4] } as any, 7);

      expect(content.save).toHaveBeenCalledWith(
        expect.objectContaining({ batches: [{ id: 1 }, { id: 4 }] }),
      );
    });

    it('404s when one of the batches is gone', async () => {
      batches.countBy.mockResolvedValue(1);

      await expect(
        service.create({ ...valid, batchIds: [1, 999] } as any, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(content.save).not.toHaveBeenCalled();
    });
  });

  describe('visibility', () => {
    const wheresOf = () => qb.wheres.join(' | ');

    it('does not restrict staff', async () => {
      await service.findAll({ page: 1, limit: 10 } as any, STAFF);

      expect(qb.params.publishedStatus).toBeUndefined();
      expect(wheresOf()).not.toContain('content_batches');
    });

    it('lets staff filter drafts explicitly', async () => {
      await service.findAll(
        { page: 1, limit: 10, status: ContentStatus.Draft } as any,
        STAFF,
      );

      expect(qb.params.status).toBe(ContentStatus.Draft);
    });

    it('hides drafts from a student', async () => {
      await service.findAll({ page: 1, limit: 10 } as any, STUDENT);

      expect(wheresOf()).toContain('content.status = :publishedStatus');
      expect(qb.params.publishedStatus).toBe(ContentStatus.Published);
    });

    it('shows a batchless student only unattached items', async () => {
      profiles.findOne.mockResolvedValue(null);

      await service.findAll({ page: 1, limit: 10 } as any, STUDENT);

      expect(wheresOf()).toContain('NOT EXISTS');
      expect(qb.params.viewerBatchId).toBeUndefined();
    });

    it('adds their own batch for a student who is in one', async () => {
      profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

      await service.findAll({ page: 1, limit: 10 } as any, STUDENT);

      expect(wheresOf()).toContain('cb.batch_id = :viewerBatchId');
      expect(qb.params.viewerBatchId).toBe(3);
    });

    it('ignores a batchId a student puts in the query', async () => {
      profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

      await service.findAll({ page: 1, limit: 10, batchId: 8 } as any, STUDENT);

      expect(qb.params.filterBatchId).toBeUndefined();
      expect(qb.params.viewerBatchId).toBe(3);
    });

    it('404s a hidden item rather than revealing it exists', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne(99, STUDENT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('the P2-5 shape', () => {
    const stored = {
      id: 99,
      title: 'Fundamental Rights',
      description: null,
      type: ContentType.Pdf,
      fileUrl: 'https://bucket/a.pdf',
      fileName: 'a.pdf',
      linkUrl: null,
      subjectId: 1,
      topicId: 5,
      subtopicId: null,
      examLevelId: 2,
      status: ContentStatus.Published,
      subject: { id: 1, name: 'Indian Polity' },
      topic: { id: 5, name: 'Fundamental Rights' },
      subtopic: null,
      examLevel: { id: 2, name: 'LDC (10th Level)' },
      batches: [
        { id: 4, name: 'Zulu Batch' },
        { id: 1, name: 'Alpha Batch' },
      ],
      createdBy: 7,
      createdAt: new Date('2026-09-12T04:00:00.000Z'),
      updatedAt: new Date('2026-09-12T04:00:00.000Z'),
    };

    it('returns every field P2-5 names', async () => {
      qb.getOne.mockResolvedValue(stored);

      const result: any = await service.findOne(99, STAFF);

      expect(result).toMatchObject({
        id: 99,
        type: 'pdf',
        fileUrl: 'https://bucket/a.pdf',
        fileName: 'a.pdf',
        linkUrl: null,
        subjectId: 1,
        topicId: 5,
        examLevelId: 2,
        status: 'published',
      });
      // batchIds, not just the nested objects.
      expect(result.batchIds).toEqual([1, 4]);
    });

    it('renders uploadedAt as a day, never a timestamp', async () => {
      qb.getOne.mockResolvedValue(stored);

      const result: any = await service.findOne(99, STAFF);

      // 04:00 UTC on the 12th is 09:30 on the 12th in Asia/Kolkata.
      expect(result.uploadedAt).toBe('2026-09-12');
    });

    it('name-sorts batches, and keeps batchIds in the same order', async () => {
      qb.getOne.mockResolvedValue(stored);

      const result: any = await service.findOne(99, STAFF);

      expect(result.batches.map((b: any) => b.name)).toEqual([
        'Alpha Batch',
        'Zulu Batch',
      ]);
      expect(result.batchIds).toEqual(result.batches.map((b: any) => b.id));
    });

    it('carries the resolved names beside the ids, as extras', async () => {
      qb.getOne.mockResolvedValue(stored);

      const result: any = await service.findOne(99, STAFF);

      expect(result.subject).toEqual({ id: 1, name: 'Indian Polity' });
      expect(result.examLevel).toEqual({ id: 2, name: 'LDC (10th Level)' });
      expect(result.subtopic).toBeNull();
    });
  });

  describe('exam level', () => {
    it('404s an exam level that does not exist', async () => {
      examLevels.existsBy.mockResolvedValue(false);

      await expect(
        service.create({ ...valid, examLevelId: 99 } as any, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(content.save).not.toHaveBeenCalled();
    });

    it('does not look one up when none was sent', async () => {
      await service.create(valid as any, 7);

      expect(examLevels.existsBy).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('matches the title only, not the description', async () => {
      await service.findAll(
        { page: 1, limit: 10, search: 'polity' } as any,
        STAFF,
      );

      const clause = qb.wheres.find((w: string) => w.includes('ILIKE'));
      expect(clause).toContain('content.title');
      expect(clause).not.toContain('content.description');
    });
  });

  describe('view tracking', () => {
    it('records the open, with the reader that asked', async () => {
      const record = { id: 99, subjectId: 1, batches: [] };
      qb.getOne.mockResolvedValue(record);

      await service.findOne(99, STUDENT);

      expect(views.record).toHaveBeenCalledWith(record, STUDENT);
    });

    it('records nothing when the reader was refused', async () => {
      qb.getOne.mockResolvedValue(null);

      await expect(service.findOne(99, STUDENT)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(views.record).not.toHaveBeenCalled();
    });

    it('leaves it to the service to decide a staff preview is not usage', async () => {
      // findOne hands over the reader unfiltered rather than second-guessing
      // it here, so the rule lives in exactly one place.
      const record = { id: 99, subjectId: 1, batches: [] };
      qb.getOne.mockResolvedValue(record);

      await service.findOne(99, STAFF);

      expect(views.record).toHaveBeenCalledWith(record, STAFF);
    });
  });

  describe('remove', () => {
    it('stamps the actor before soft deleting', async () => {
      content.findOne.mockResolvedValue({ id: 99 });

      await service.remove(99, 7);

      expect(content.update).toHaveBeenCalledWith(99, { deletedBy: 7 });
      expect(content.softDelete).toHaveBeenCalledWith(99);
      expect(content.update.mock.invocationCallOrder[0]).toBeLessThan(
        content.softDelete.mock.invocationCallOrder[0],
      );
    });

    it('404s an item that is not there', async () => {
      content.findOne.mockResolvedValue(null);

      await expect(service.remove(99, 7)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(content.softDelete).not.toHaveBeenCalled();
    });
  });
});
