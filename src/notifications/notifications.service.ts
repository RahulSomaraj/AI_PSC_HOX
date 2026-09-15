import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { Batch } from '../batches/entities/batch.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { FindNotificationsQueryDto } from './dto/find-notifications-query.dto';
import { NotificationDto } from './dto/notification.dto';
import {
  ALL_STUDENTS,
  NotificationChannel,
  NotificationStatus,
} from './notification-fields.enum';

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
   * The console names its target rather than sending an id: `"All Students"`,
   * or a batch by name, because its composer is built from the batch list's
   * names. Batch names are unique among live batches (a partial unique index
   * on `batches`), so a name resolves to exactly one batch or to none.
   *
   * Channel and status are fixed. Nothing sends SMS or email, so every
   * announcement is an in-app one, and an in-app announcement cannot fail -
   * it is a row students read.
   */
  async create(
    dto: CreateNotificationDto,
    actorId: number,
  ): Promise<NotificationDto> {
    const batch = await this.resolveTarget(dto.target);

    const saved = await this.notifications.save(
      this.notifications.create({
        title: dto.title,
        message: dto.message,
        language: dto.language,
        channel: NotificationChannel.AppPush,
        status: NotificationStatus.Sent,
        batchId: batch?.id ?? null,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );

    return this.present({ ...saved, batch });
  }

  /**
   * Every announcement ever sent, newest first - the admin Notifications
   * list.
   *
   * A plain array, as the console reads it: it searches, filters and pages
   * this list itself.
   */
  async findAllSent(): Promise<NotificationDto[]> {
    const records = await this.withTargets()
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .getMany();

    return records.map((record) => this.present(record));
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

    const qb = this.withTargets();
    if (batchId === null) {
      qb.andWhere('notification.batchId IS NULL');
    } else {
      qb.andWhere(
        '(notification.batchId IS NULL OR notification.batchId = :batchId)',
        { batchId },
      );
    }

    const [records, total] = await qb
      // id breaks ties: two announcements posted in the same millisecond
      // would otherwise page inconsistently.
      .orderBy('notification.createdAt', 'DESC')
      .addOrderBy('notification.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: records.map((record) => this.present(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Live notifications with their batch joined, **including a batch that has
   * since been deleted**.
   *
   * Without `withDeleted()` a soft-deleted batch would join as null, and an
   * announcement that went to one batch would suddenly report
   * "All Students" - rewriting who it was sent to. withDeleted() lifts the
   * soft-delete filter from every alias, so the notification's own is put
   * back explicitly.
   */
  private withTargets(): SelectQueryBuilder<Notification> {
    return this.notifications
      .createQueryBuilder('notification')
      .leftJoinAndSelect('notification.batch', 'batch')
      .withDeleted()
      .where('notification.deletedAt IS NULL');
  }

  /**
   * `"All Students"` to null; a batch name to its live batch.
   *
   * A 404 rather than a silent fallback to everyone: sending a batch-only
   * message to every student because a name was misspelt is the worse error.
   * (A batch literally named "All Students" could never be targeted; that is
   * a name no admin should pick.)
   */
  private async resolveTarget(target: string): Promise<Batch | null> {
    if (target === ALL_STUDENTS) return null;

    const batch = await this.batches.findOne({ where: { name: target } });
    if (!batch) {
      throw new NotFoundException(`No batch named "${target}"`);
    }
    return batch;
  }

  /** The console's AdminNotification, plus the batch id `target` names. */
  private present(
    record: Notification & { batch?: Batch | null },
  ): NotificationDto {
    return {
      id: record.id,
      title: record.title,
      message: record.message,
      channel: record.channel,
      // Only a null batchId means everyone. A batch id whose row did not load
      // must never be reported as "All Students" - that would misstate who
      // the message went to.
      target:
        record.batch?.name ??
        (record.batchId === null ? ALL_STUDENTS : `Batch #${record.batchId}`),
      language: record.language,
      sentAt: new Date(record.createdAt).toISOString(),
      status: record.status,
      batchId: record.batchId,
    };
  }
}
