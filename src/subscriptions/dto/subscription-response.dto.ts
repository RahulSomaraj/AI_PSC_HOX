import { ApiProperty } from '@nestjs/swagger';
import { Subscription } from '../entities/subscription.entity';

/**
 * The wire shape of a subscription: every stored column plus `isActive`,
 * which is derived here rather than stored.
 *
 * Everything the service hands back goes through fromEntity, so no route can
 * return a subscription whose isActive was forgotten.
 */
export class SubscriptionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: 'Premium' })
  planName: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  startDate: Date;

  @ApiProperty({ example: '2027-01-01T00:00:00.000Z' })
  expiresAt: Date;

  @ApiProperty({ example: null, nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({
    description:
      'Derived, not stored: true when the term has not run out and the ' +
      'subscription has not been cancelled. Computed per response, so it ' +
      'flips to false on its own once expiresAt passes.',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: null, nullable: true })
  deletedAt: Date | null;

  @ApiProperty({ example: 1, nullable: true })
  createdBy: number | null;

  @ApiProperty({ example: null, nullable: true })
  updatedBy: number | null;

  @ApiProperty({ example: null, nullable: true })
  deletedBy: number | null;

  /**
   * `now` is a parameter so that mapping a list gives every row the same
   * instant - two rows in one response should never disagree about when
   * "now" was.
   *
   * The dates are re-wrapped rather than used as they stand: a row read back
   * from Postgres carries real Date objects, but the row returned straight
   * out of repository.save() still holds the ISO strings the DTO came in
   * with. Comparing one of those strings against a Date yields false, which
   * would report a brand new subscription as inactive.
   */
  static fromEntity(
    subscription: Subscription,
    now: Date = new Date(),
  ): SubscriptionResponseDto {
    const expiresAt = new Date(subscription.expiresAt);
    const cancelledAt = subscription.cancelledAt
      ? new Date(subscription.cancelledAt)
      : null;

    return {
      id: subscription.id,
      userId: subscription.userId,
      planName: subscription.planName,
      startDate: new Date(subscription.startDate),
      expiresAt,
      cancelledAt,
      isActive: expiresAt.getTime() > now.getTime() && cancelledAt === null,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
      deletedAt: subscription.deletedAt,
      createdBy: subscription.createdBy,
      updatedBy: subscription.updatedBy,
      deletedBy: subscription.deletedBy,
    };
  }

  static fromEntities(
    subscriptions: Subscription[],
  ): SubscriptionResponseDto[] {
    const now = new Date();
    return subscriptions.map((s) => SubscriptionResponseDto.fromEntity(s, now));
  }
}
