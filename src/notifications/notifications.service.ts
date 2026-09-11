import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Batch } from '../batches/entities/batch.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsQueryDto } from './dto/find-notifications-query.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
    @InjectRepository(Batch)
    private readonly batches: Repository<Batch>,
    @InjectRepository(AspirantProfile)
    private readonly profiles: Repository<AspirantProfile>,
  ) {}

  /**
   * Posts one announcement, to a batch or to everyone.
   *
   * The batch is checked before the insert rather than left to the foreign
   * key: a live batch id gives a clean 404, where the FK would surface as a
   * 500 from a driver error.
   */
  async create(dto: CreateNotificationDto, actorId: number) {
    if (dto.batchId !== undefined) {
      const batchExists = await this.batches.existsBy({
        id: dto.batchId,
        deletedAt: IsNull(),
      });
      if (!batchExists) throw new NotFoundException('Batch not found');
    }

    const saved = await this.notifications.save(
      this.notifications.create({
        title: dto.title,
        body: dto.body,
        batchId: dto.batchId ?? null,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );

    return this.present(saved);
  }

  /**
   * The announcements one user should see: everything sent to everyone, plus
   * everything sent to the batch they are in.
   *
   * A user's batch lives on their aspirant profile, not on the user row, so
   * it is resolved first. Anyone without a profile or without a batch - an
   * admin, a staff account, a student not yet assigned - sees the global
   * announcements and nothing else, which is the correct answer rather than
   * an error.
   */
  async findForUser(userId: number, query: FindNotificationsQueryDto) {
    const { page, limit } = query;

    const profile = await this.profiles.findOne({
      where: { userId },
      select: { id: true, batchId: true },
    });
    const batchId = profile?.batchId ?? null;

    // An array of conditions is OR in TypeORM. Going through `findAndCount`
    // rather than a query builder keeps the soft-delete filter automatic on
    // both the rows and the count.
    const where =
      batchId === null
        ? { batchId: IsNull() }
        : [{ batchId: IsNull() }, { batchId }];

    const [records, total] = await this.notifications.findAndCount({
      where,
      // id breaks ties: two announcements posted in the same millisecond
      // would otherwise page inconsistently.
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items: records.map((record) => this.present(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** Audit columns are internal; the reader gets what the bell needs. */
  private present(record: Notification) {
    return {
      id: record.id,
      title: record.title,
      body: record.body,
      batchId: record.batchId,
      createdAt: record.createdAt,
    };
  }
}
