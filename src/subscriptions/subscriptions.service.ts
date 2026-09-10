import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { User } from '../users/entities/user.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/subscription-response.dto';

// Postgres foreign_key_violation - the FK on subscriptions.userId.
const FOREIGN_KEY_VIOLATION = '23503';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * A subscription may only be filed against a live user. The FK stops an id
   * that was never issued, but says nothing about a user that has been soft
   * deleted - those rows are still present as far as Postgres is concerned.
   */
  private async assertUserExists(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }
  }

  /**
   * A term that ends before it starts is never what the caller meant, and it
   * would be permanently inactive - expiresAt is already in the past by the
   * time the row is written.
   */
  private assertDateOrder(startDate: Date, expiresAt: Date) {
    if (expiresAt.getTime() <= startDate.getTime()) {
      throw new BadRequestException('expiresAt must be after startDate');
    }
  }

  /**
   * The active predicate, in one place: the term has not run out and the
   * subscription has not been cancelled. Every count and lookup builds its
   * WHERE from this, so the SQL and SubscriptionResponseDto.isActive cannot
   * drift apart.
   *
   * `now` is passed in so that one request's queries all use a single
   * instant.
   */
  private activeWhere(now: Date) {
    return {
      deletedAt: IsNull(),
      cancelledAt: IsNull(),
      expiresAt: MoreThan(now),
    };
  }

  /** The entity behind an id, or 404. Internal - routes return the DTO. */
  private async findEntity(id: number): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id, deletedAt: IsNull() },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  async create(
    createSubscriptionDto: CreateSubscriptionDto,
    userId: number,
  ): Promise<SubscriptionResponseDto> {
    try {
      const planName = createSubscriptionDto.planName.trim();
      const startDate = new Date(createSubscriptionDto.startDate);
      const expiresAt = new Date(createSubscriptionDto.expiresAt);

      await this.assertUserExists(createSubscriptionDto.userId);
      this.assertDateOrder(startDate, expiresAt);

      // No check for an existing subscription on this user: many per user is
      // the point. Renewals and upgrades stack up as history.
      const subscription = this.subscriptionRepository.create({
        userId: createSubscriptionDto.userId,
        planName,
        startDate,
        expiresAt,
        createdBy: userId,
      });
      const saved = await this.subscriptionRepository.save(subscription);
      return SubscriptionResponseDto.fromEntity(saved);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // assertUserExists can lose a race with a user being hard-deleted;
      // the constraint is the real guarantee.
      if ((err as { code?: string })?.code === FOREIGN_KEY_VIOLATION) {
        throw new NotFoundException(
          `User with ID ${createSubscriptionDto.userId} not found`,
        );
      }
      throw new InternalServerErrorException('Failed to create subscription');
    }
  }

  async findAll(): Promise<SubscriptionResponseDto[]> {
    try {
      const subscriptions = await this.subscriptionRepository.find({
        where: { deletedAt: IsNull() },
        order: { expiresAt: 'DESC', id: 'DESC' },
      });
      return SubscriptionResponseDto.fromEntities(subscriptions);
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to retrieve subscriptions',
      );
    }
  }

  async findOne(id: number): Promise<SubscriptionResponseDto> {
    try {
      return SubscriptionResponseDto.fromEntity(await this.findEntity(id));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch subscription');
    }
  }

  /** A user's whole run of subscriptions, newest term first. */
  async findAllForUser(userId: number): Promise<SubscriptionResponseDto[]> {
    try {
      await this.assertUserExists(userId);

      const subscriptions = await this.subscriptionRepository.find({
        where: { userId, deletedAt: IsNull() },
        order: { expiresAt: 'DESC', id: 'DESC' },
      });
      return SubscriptionResponseDto.fromEntities(subscriptions);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to retrieve subscriptions for user',
      );
    }
  }

  /**
   * The subscription the profile card shows: the active one running furthest
   * into the future. A user with none active gets null rather than a 404, so
   * the card renders an empty state instead of handling an error - "no
   * subscription" is a normal thing for a user to be.
   *
   * Ordering by expiresAt matters when terms overlap, which they do whenever
   * someone renews early: the renewal is the one to show, not the term it
   * was bought to follow.
   */
  async findCurrentForUser(
    userId: number,
  ): Promise<SubscriptionResponseDto | null> {
    try {
      await this.assertUserExists(userId);

      const now = new Date();
      const current = await this.subscriptionRepository.findOne({
        where: { userId, ...this.activeWhere(now) },
        order: { expiresAt: 'DESC', id: 'DESC' },
      });
      return current ? SubscriptionResponseDto.fromEntity(current, now) : null;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to fetch current subscription',
      );
    }
  }

  /**
   * Dashboard tile: active subscriptions held by live users.
   *
   * The join onto users is what makes this tile comparable with Total
   * Students beside it. UsersService.countByRole() counts `deletedAt IS
   * NULL`, so a soft-deleted user leaves that tile immediately; without the
   * join their subscription would linger here and the two numbers would tell
   * different stories about the same people.
   *
   * The condition is composed here rather than folded into activeWhere():
   * "this subscription is active" and "its owner is still on the books" are
   * separate claims, and findCurrentForUser has already established the
   * second through assertUserExists - it should not pay for a join to
   * re-check it on every profile card load.
   */
  async countActive(): Promise<{ activeSubscriptions: number }> {
    try {
      const activeSubscriptions = await this.subscriptionRepository.count({
        where: {
          ...this.activeWhere(new Date()),
          user: { deletedAt: IsNull() },
        },
      });
      return { activeSubscriptions };
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to count active subscriptions',
      );
    }
  }

  async update(
    id: number,
    updateSubscriptionDto: UpdateSubscriptionDto,
    userId: number,
  ): Promise<SubscriptionResponseDto> {
    try {
      const subscription = await this.findEntity(id);

      // Either date may move, so both sides are resolved before the order is
      // checked - a request may push expiresAt out, pull startDate back, or
      // move both at once.
      const startDate = updateSubscriptionDto.startDate
        ? new Date(updateSubscriptionDto.startDate)
        : new Date(subscription.startDate);
      const expiresAt = updateSubscriptionDto.expiresAt
        ? new Date(updateSubscriptionDto.expiresAt)
        : new Date(subscription.expiresAt);
      this.assertDateOrder(startDate, expiresAt);

      subscription.startDate = startDate;
      subscription.expiresAt = expiresAt;

      if (updateSubscriptionDto.planName !== undefined) {
        subscription.planName = updateSubscriptionDto.planName.trim();
      }

      // Absent and null mean different things here: absent leaves the
      // cancellation as it stands, null lifts one made in error. Testing
      // against undefined rather than `in` keeps that true however
      // class-transformer chooses to materialise a missing key.
      if (updateSubscriptionDto.cancelledAt !== undefined) {
        subscription.cancelledAt =
          updateSubscriptionDto.cancelledAt === null
            ? null
            : new Date(updateSubscriptionDto.cancelledAt);
      }

      subscription.updatedBy = userId;

      const saved = await this.subscriptionRepository.save(subscription);
      return SubscriptionResponseDto.fromEntity(saved);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update subscription');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const subscription = await this.findEntity(id);

      await this.subscriptionRepository.update(subscription.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return {
        message: `Subscription with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete subscription');
    }
  }
}
