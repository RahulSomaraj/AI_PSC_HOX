import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ContentService, Viewer } from './content.service';
import { ContentType } from './content-type.enum';

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
  let profiles: any;
  let views: any;
  let qb: any;
  let service: ContentService;

  const valid = {
    title: 'Fundamental Rights',
    type: ContentType.Document,
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
    profiles = { findOne: jest.fn().mockResolvedValue(null) };
    views = { record: jest.fn().mockResolvedValue(undefined) };

    service = new ContentService(
      content,
      batches,
      subjects,
      topics,
      subtopics,
      profiles,
      views,
    );
    // create() and update() re-read through findOne(); give them a row.
    qb.getOne.mockResolvedValue({
      id: 99,
      title: valid.title,
      batches: [],
      subject: { id: 1, name: 'Polity' },
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
          { ...valid, sourceUrl: 'https://youtube.com/watch?v=x' } as any,
          7,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('accepts an external link with no uploaded file', async () => {
      await service.create(
        {
          ...valid,
          fileUrl: undefined,
          sourceUrl: 'https://youtube.com/watch?v=x',
        } as any,
        7,
      );

      expect(content.save).toHaveBeenCalledWith(
        expect.objectContaining({
          fileUrl: null,
          sourceUrl: 'https://youtube.com/watch?v=x',
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
        sourceUrl: null,
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

      expect(wheresOf()).not.toContain('isPublished = true');
      expect(wheresOf()).not.toContain('content_batches');
    });

    it('lets staff filter drafts explicitly', async () => {
      await service.findAll(
        { page: 1, limit: 10, isPublished: false } as any,
        STAFF,
      );

      expect(qb.params.isPublished).toBe(false);
    });

    it('hides drafts from a student', async () => {
      await service.findAll({ page: 1, limit: 10 } as any, STUDENT);

      expect(wheresOf()).toContain('content.isPublished = true');
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
