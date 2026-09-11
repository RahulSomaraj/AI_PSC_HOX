import { NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { NotificationsService } from './notifications.service';

const repoMock = () => ({
  create: jest.fn((input) => input),
  save: jest.fn(),
  findAndCount: jest.fn().mockResolvedValue([[], 0]),
  findOne: jest.fn(),
  existsBy: jest.fn(),
});

describe('NotificationsService', () => {
  let notifications: ReturnType<typeof repoMock>;
  let batches: ReturnType<typeof repoMock>;
  let profiles: ReturnType<typeof repoMock>;
  let service: NotificationsService;

  beforeEach(() => {
    notifications = repoMock();
    batches = repoMock();
    profiles = repoMock();
    service = new NotificationsService(
      notifications as any,
      batches as any,
      profiles as any,
    );
  });

  describe('create', () => {
    const announcement = { title: 'Class moved', body: 'Friday, 4 PM' };

    beforeEach(() => {
      notifications.save.mockImplementation((row) =>
        Promise.resolve({ ...row, id: 1, createdAt: new Date() }),
      );
    });

    it('sends to everyone when no batch is named', async () => {
      await service.create(announcement, 7);

      expect(batches.existsBy).not.toHaveBeenCalled();
      expect(notifications.save).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: null }),
      );
    });

    it('stamps the author from the JWT, not the body', async () => {
      await service.create(announcement, 7);

      expect(notifications.save).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 7, updatedBy: 7 }),
      );
    });

    it('checks a named batch is live before inserting', async () => {
      batches.existsBy.mockResolvedValue(true);

      await service.create({ ...announcement, batchId: 3 }, 7);

      expect(batches.existsBy).toHaveBeenCalledWith({
        id: 3,
        deletedAt: IsNull(),
      });
      expect(notifications.save).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: 3 }),
      );
    });

    it('is a 404, not a foreign key error, for a batch that is gone', async () => {
      batches.existsBy.mockResolvedValue(false);

      await expect(
        service.create({ ...announcement, batchId: 999 }, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(notifications.save).not.toHaveBeenCalled();
    });

    it('returns the announcement without its audit columns', async () => {
      const result = await service.create(announcement, 7);

      expect(Object.keys(result).sort()).toEqual([
        'batchId',
        'body',
        'createdAt',
        'id',
        'title',
      ]);
    });
  });

  describe('findForUser', () => {
    const page = { page: 1, limit: 10 };

    it('shows a batchless reader only what went to everyone', async () => {
      profiles.findOne.mockResolvedValue(null);

      await service.findForUser(42, page);

      expect(notifications.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { batchId: IsNull() } }),
      );
    });

    it('treats a student assigned to no batch the same way', async () => {
      profiles.findOne.mockResolvedValue({ id: 5, batchId: null });

      await service.findForUser(42, page);

      expect(notifications.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({ where: { batchId: IsNull() } }),
      );
    });

    it('adds the batch announcements for a student who is in one', async () => {
      profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

      await service.findForUser(42, page);

      expect(notifications.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: [{ batchId: IsNull() }, { batchId: 3 }],
        }),
      );
    });

    it('resolves the batch from the caller, never from the query', async () => {
      profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

      await service.findForUser(42, page);

      expect(profiles.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 42 } }),
      );
    });

    it('pages newest first, with id breaking ties', async () => {
      profiles.findOne.mockResolvedValue(null);

      await service.findForUser(42, { page: 3, limit: 20 });

      expect(notifications.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          order: { createdAt: 'DESC', id: 'DESC' },
          skip: 40,
          take: 20,
        }),
      );
    });

    it('returns the list under items, with the page envelope', async () => {
      profiles.findOne.mockResolvedValue(null);
      notifications.findAndCount.mockResolvedValue([
        [
          {
            id: 1,
            title: 'Results out',
            body: 'LDC results published',
            batchId: null,
            createdAt: new Date('2026-09-11T10:00:00Z'),
            createdBy: 7,
            deletedAt: null,
          },
        ],
        15,
      ]);

      const result = await service.findForUser(42, page);

      expect(result).toEqual({
        items: [
          {
            id: 1,
            title: 'Results out',
            body: 'LDC results published',
            batchId: null,
            createdAt: new Date('2026-09-11T10:00:00Z'),
          },
        ],
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      });
    });
  });
});
