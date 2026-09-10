import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// A subscription is one paid term on a plan, shown as "Premium - expires
// 12 Mar 2026" on the profile card.
//
// A user accumulates subscriptions over time - renewals, upgrades, lapsed
// terms - and the whole run is kept as history. So the index on userId is
// deliberately NOT unique; "the current one" is a query (see
// SubscriptionsService.findCurrentForUser), not a constraint.
@Index('IDX_subscriptions_userId', ['userId'])
@Entity({ name: 'subscriptions' })
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  // RESTRICT: a user with subscriptions on record cannot be hard-deleted out
  // from under them, the same guard AspirantProfile puts on batchId. Soft
  // deletes are not covered by the constraint - UsersService owns that rule.
  @Column({ type: 'int' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ length: 100 })
  planName: string;

  @Column({ type: 'timestamptz' })
  startDate: Date;

  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  // Set when the subscription is cancelled before its term runs out. Null on
  // a subscription that is running or that simply expired on schedule.
  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  // No isActive column by design. Active means `expiresAt > now() AND
  // cancelledAt IS NULL`, which changes on its own as the clock passes
  // expiresAt - a stored flag would be stale the moment nothing wrote to it.
  // SubscriptionResponseDto derives it on the way out.

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ type: 'int', nullable: true })
  updatedBy: number | null;

  @Column({ type: 'int', nullable: true })
  deletedBy: number | null;
}
