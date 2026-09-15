import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BatchesService } from './batches.service';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { BatchMode } from '../common/enums/batch-mode.enum';
import { BatchStatus } from '../common/enums/batch-status.enum';

describe('BatchesService', () => {
  let batches: any;
  let examPosts: any;
  let service: BatchesService;

  /** The body the console's Create Batch form actually sends. */
  const consoleBody = {
    name: 'Alpha Batch 2026',
    targetExamId: 3,
    description: 'Weekend online batch',
    mode: BatchMode.Online,
    timings: '10:00 AM - 12:00 PM',
    startDate: '2026-01-01',
    endDate: '2026-12-01',
    shift: 'Morning' as const,
  };

  const stored = {
    id: 7,
    name: 'Alpha Batch 2026',
    examId: 3,
    mode: BatchMode.Online,
    studentCount: 0,
    startDate: '2026-01-01',
    endDate: '2026-12-01',
    status: BatchStatus.Upcoming,
    description: 'Weekend online batch',
    timings: '10:00 AM - 12:00 PM',
    imageUrl: null,
  };

  beforeEach(() => {
    batches = {
      create: jest.fn((value) => ({ ...value })),
      save: jest.fn((value) => Promise.resolve({ id: 7, ...value })),
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([stored]),
      findAndCount: jest.fn().mockResolvedValue([[stored], 1]),
      softDelete: jest.fn(),
    };
    examPosts = { findOne: jest.fn().mockResolvedValue({ id: 3 }) };
    service = new BatchesService(batches, examPosts);
  });

  describe('create', () => {
    it('accepts the console body as sent', async () => {
      batches.findOne.mockResolvedValue(null); // name is free

      await service.create(consoleBody, 1);

      expect(examPosts.findOne).toHaveBeenCalledWith({ where: { id: 3 } });
    });

    it('stores targetExamId in exam_id', async () => {
      batches.findOne.mockResolvedValue(null);

      await service.create(consoleBody, 1);

      const saved = batches.create.mock.calls[0][0];
      expect(saved.examId).toBe(3);
      expect(saved).not.toHaveProperty('targetExamId');
    });

    it('drops shift, which has no column', async () => {
      batches.findOne.mockResolvedValue(null);

      await service.create(consoleBody, 1);

      expect(batches.create.mock.calls[0][0]).not.toHaveProperty('shift');
    });

    it('keeps timings as the admin typed them', async () => {
      batches.findOne.mockResolvedValue(null);

      await service.create(consoleBody, 1);

      expect(batches.create.mock.calls[0][0].timings).toBe(
        '10:00 AM - 12:00 PM',
      );
    });

    it('404s an exam that does not exist', async () => {
      examPosts.findOne.mockResolvedValue(null);

      await expect(service.create(consoleBody, 1)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(batches.save).not.toHaveBeenCalled();
    });
  });

  describe('responses', () => {
    it('carry targetExamId beside examId', async () => {
      batches.findOne.mockResolvedValue({ ...stored });

      const batch = await service.findOne(7);

      expect(batch.targetExamId).toBe(3);
      expect(batch.examId).toBe(3);
    });

    it.each([
      [BatchStatus.Active, true],
      [BatchStatus.Ongoing, true],
      [BatchStatus.Upcoming, true],
      [BatchStatus.Inactive, false],
    ])('report a %s batch as isActive %s', async (status, isActive) => {
      batches.findOne.mockResolvedValue({ ...stored, status });

      expect((await service.findOne(7)).isActive).toBe(isActive);
    });

    it('present every row of the list the same way', async () => {
      const list = (await service.findAll({})) as any[];

      expect(list[0]).toMatchObject({ targetExamId: 3, isActive: true });
    });

    it('do not alter the entity that was loaded', async () => {
      const entity = { ...stored };
      batches.findOne.mockResolvedValue(entity);

      await service.findOne(7);

      expect(entity).not.toHaveProperty('targetExamId');
    });
  });

  // The service tests above bypass validation entirely. This runs the console's
  // real body through the same whitelist rules main.ts applies, so a field
  // the DTO forgot to declare fails here rather than as a 400 in the console.
  describe('the console body against main.ts validation', () => {
    const validateAs = async (dtoClass: any, body: object) =>
      validate(plainToInstance(dtoClass, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

    it('passes create, shift and all', async () => {
      expect(await validateAs(CreateBatchDto, consoleBody)).toEqual([]);
    });

    it('passes a partial update carrying shift', async () => {
      expect(
        await validateAs(UpdateBatchDto, {
          timings: '6:00 PM - 8:00 PM',
          shift: 'Evening',
        }),
      ).toEqual([]);
    });

    it('still rejects the old examId name', async () => {
      const errors = await validateAs(CreateBatchDto, {
        ...consoleBody,
        examId: 3,
      });
      expect(errors.map((e) => e.property)).toContain('examId');
    });
  });

  describe('findAll', () => {
    it('returns a plain array when no page is asked for - what the console reads', async () => {
      const result = await service.findAll({ mode: BatchMode.Online });

      expect(Array.isArray(result)).toBe(true);
      expect(batches.findAndCount).not.toHaveBeenCalled();
      expect(batches.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { mode: BatchMode.Online } }),
      );
    });

    it('returns one page under data when a page is asked for', async () => {
      batches.findAndCount.mockResolvedValue([[stored], 24]);

      const result: any = await service.findAll({ page: 2, limit: 10 });

      expect(batches.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
      expect(result).toMatchObject({
        total: 24,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
      expect(result.data[0]).toMatchObject({ targetExamId: 3 });
      expect(result).not.toHaveProperty('items');
    });

    it('caps the page size at 100', async () => {
      await service.findAll({ page: 1, limit: 500 });

      expect(batches.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  describe('update', () => {
    it('maps targetExamId and validates the new exam', async () => {
      batches.findOne.mockResolvedValue({ ...stored });

      await service.update(7, { targetExamId: 5 }, 1);

      expect(examPosts.findOne).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(batches.save.mock.calls[0][0].examId).toBe(5);
    });

    it('leaves the exam alone when targetExamId is not sent', async () => {
      batches.findOne.mockResolvedValue({ ...stored });

      await service.update(7, { timings: '6:00 PM - 8:00 PM' }, 1);

      expect(examPosts.findOne).not.toHaveBeenCalled();
      expect(batches.save.mock.calls[0][0].examId).toBe(3);
    });

    it('saves the entity, not the presented view', async () => {
      batches.findOne.mockResolvedValue({ ...stored });

      await service.update(7, { shift: 'Evening' }, 1);

      const saved = batches.save.mock.calls[0][0];
      expect(saved).not.toHaveProperty('shift');
      expect(saved).not.toHaveProperty('isActive');
    });
  });
});
