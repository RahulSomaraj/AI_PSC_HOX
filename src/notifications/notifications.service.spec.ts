import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import {
  ALL_STUDENTS,
  NotificationChannel,
  NotificationLanguage,
  NotificationStatus,
} from './notification-fields.enum';

/** What the console's composer sends. */
const composed = {
  title: 'Friday class moved',
  language: NotificationLanguage.English,
  message: 'Starts at 4 PM this week.',
  target: ALL_STUDENTS,
};

function queryBuilder(records: unknown[] = [], total = 0) {
  const qb: any = {};
  for (const method of [
    'leftJoinAndSelect',
    'withDeleted',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
  ]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.getMany = jest.fn().mockResolvedValue(records);
  qb.getManyAndCount = jest.fn().mockResolvedValue([records, total]);
  return qb;
}

const row = (over: object = {}) => ({
  id: 1,
  title: 'Results out',
  message: 'LDC results published',
  channel: NotificationChannel.AppPush,
  language: NotificationLanguage.English,
  status: NotificationStatus.Sent,
  batchId: null,
  batch: null,
  createdAt: new Date('2026-09-11T10:00:00.000Z'),
  ...over,
});

describe('NotificationsService', () => {
  let notifications: any;
  let batches: any;
  let profiles: any;
  let qb: any;
  let service: NotificationsService;

  beforeEach(() => {
    qb = queryBuilder();
    notifications = {
      create: jest.fn((input) => input),
      save: jest.fn((input) =>
        Promise.resolve({
          ...input,
          id: 12,
          createdAt: new Date('2026-09-15T08:00:00.000Z'),
        }),
      ),
      createQueryBuilder: jest.fn().mockReturnValue(qb),
    };
    batches = { findOne: jest.fn() };
    profiles = { findOne: jest.fn().mockResolvedValue(null) };
    service = new NotificationsService(notifications, batches, profiles);
  });

  describe('the composer body against main.ts validation', () => {
    const errorsFor = async (body: object) =>
      validate(plainToInstance(CreateNotificationDto, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      });

    it('passes exactly what the console sends', async () => {
      expect(await errorsFor(composed)).toEqual([]);
    });

    it.each([
      ['no language chosen', { language: '' }],
      ['no target chosen', { target: '' }],
      ['a blank title', { title: '   ' }],
      ['the old body field', { body: 'x' }],
      ['the old batchId field', { batchId: 3 }],
    ])('rejects %s', async (_case, over) => {
      expect(await errorsFor({ ...composed, ...over })).not.toEqual([]);
    });
  });

  describe('create', () => {
    it('sends to everyone for "All Students", without a batch lookup', async () => {
      const result = await service.create(composed, 7);

      expect(batches.findOne).not.toHaveBeenCalled();
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: null }),
      );
      expect(result.target).toBe(ALL_STUDENTS);
    });

    it('resolves a batch name to its batch', async () => {
      batches.findOne.mockResolvedValue({ id: 3, name: 'LDC Evening 2026' });

      const result = await service.create(
        { ...composed, target: 'LDC Evening 2026' },
        7,
      );

      expect(batches.findOne).toHaveBeenCalledWith({
        where: { name: 'LDC Evening 2026' },
      });
      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ batchId: 3 }),
      );
      expect(result).toMatchObject({ target: 'LDC Evening 2026', batchId: 3 });
    });

    it('404s a batch name that does not exist, rather than sending to everyone', async () => {
      batches.findOne.mockResolvedValue(null);

      await expect(
        service.create({ ...composed, target: 'No Such Batch' }, 7),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(notifications.save).not.toHaveBeenCalled();
    });

    it('stores an in-app announcement, marked sent', async () => {
      await service.create(composed, 7);

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({
          channel: NotificationChannel.AppPush,
          status: NotificationStatus.Sent,
          language: NotificationLanguage.English,
          message: 'Starts at 4 PM this week.',
        }),
      );
    });

    it('stamps the author from the JWT, not the body', async () => {
      await service.create(composed, 7);

      expect(notifications.create).toHaveBeenCalledWith(
        expect.objectContaining({ createdBy: 7, updatedBy: 7 }),
      );
    });

    it("answers in the console's AdminNotification shape", async () => {
      await expect(service.create(composed, 7)).resolves.toEqual({
        id: 12,
        title: 'Friday class moved',
        message: 'Starts at 4 PM this week.',
        channel: 'app-push',
        target: ALL_STUDENTS,
        language: 'en',
        sentAt: '2026-09-15T08:00:00.000Z',
        status: 'sent',
        batchId: null,
      });
    });
  });

  describe('findAllSent', () => {
    it('returns every notification as a plain array, newest first', async () => {
      qb.getMany.mockResolvedValue([row({ id: 2 }), row({ id: 1 })]);

      const result = await service.findAllSent();

      expect(Array.isArray(result)).toBe(true);
      expect(result.map((n) => n.id)).toEqual([2, 1]);
      expect(qb.orderBy).toHaveBeenCalledWith('notification.createdAt', 'DESC');
    });

    it('names the batch a notification went to', async () => {
      qb.getMany.mockResolvedValue([
        row({ batchId: 3, batch: { id: 3, name: 'LDC Evening 2026' } }),
      ]);

      const [notification] = await service.findAllSent();

      expect(notification.target).toBe('LDC Evening 2026');
    });

    it('keeps the name of a batch deleted since', async () => {
      await service.findAllSent();

      // withDeleted keeps the deleted batch joined; the notification's own
      // soft delete is then applied by hand.
      expect(qb.withDeleted).toHaveBeenCalled();
      expect(qb.where).toHaveBeenCalledWith('notification.deletedAt IS NULL');
    });

    it('never reports a batch message as "All Students" when the batch did not load', async () => {
      qb.getMany.mockResolvedValue([row({ batchId: 3, batch: null })]);

      const [notification] = await service.findAllSent();

      expect(notification.target).not.toBe(ALL_STUDENTS);
      expect(notification.target).toBe('Batch #3');
    });
  });

  describe('findForUser', () => {
    const page = { page: 1, limit: 10 };

    it('shows a batchless reader only what went to everyone', async () => {
      profiles.findOne.mockResolvedValue(null);

      await service.findForUser(42, page);

      expect(qb.andWhere).toHaveBeenCalledWith('notification.batchId IS NULL');
    });

    it('adds their own batch for a student who is in one', async () => {
      profiles.findOne.mockResolvedValue({ id: 5, batchId: 3 });

      await service.findForUser(42, page);

      expect(qb.andWhere).toHaveBeenCalledWith(
        '(notification.batchId IS NULL OR notification.batchId = :batchId)',
        { batchId: 3 },
      );
    });

    it('resolves the batch from the caller, never from the query', async () => {
      await service.findForUser(42, page);

      expect(profiles.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 42 } }),
      );
    });

    it('pages newest first', async () => {
      await service.findForUser(42, { page: 3, limit: 20 });

      expect(qb.skip).toHaveBeenCalledWith(40);
      expect(qb.take).toHaveBeenCalledWith(20);
      expect(qb.addOrderBy).toHaveBeenCalledWith('notification.id', 'DESC');
    });

    it('returns the page envelope around the same shape', async () => {
      qb.getManyAndCount.mockResolvedValue([[row()], 15]);

      const result = await service.findForUser(42, page);

      expect(result).toMatchObject({
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      });
      expect(result.items[0]).toMatchObject({
        message: 'LDC results published',
        target: ALL_STUDENTS,
      });
    });
  });
});
