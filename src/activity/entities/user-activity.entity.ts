import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

// One row per user per calendar day they were active.
//
// Distinct from UserSession, which records a *login*: a session row is
// written when credentials are exchanged, and refresh rotates that row
// without touching its createdAt. So sessions measure daily logins - a
// student who stays signed in for a week produces one session row and
// seven rows here. That difference is the whole reason this table exists.
//
// No audit actor columns and no soft delete: a row is a fact about what
// happened, not a record anyone edits. It is only ever inserted, or had its
// lastSeenAt moved forward.
@Index('UQ_user_activity_user_date', ['userId', 'activityDate'], {
  unique: true,
})
// The DAU chart scans a date range across all users, so the range predicate
// needs its own index - the unique one above leads with userId and cannot
// serve it.
@Index('IDX_user_activity_date', ['activityDate'])
@Entity({ name: 'user_activity' })
export class UserActivity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  // CASCADE, matching `exams` and `enrollments`: activity is meaningless
  // once the user row is genuinely gone. Soft-deleted users keep their
  // history, since a soft delete does not fire the constraint.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  // The calendar date in ACTIVITY_TIMEZONE (default Asia/Kolkata), not UTC.
  //
  // This matters: at UTC+5:30, a student active at 01:00 IST is at 19:30 UTC
  // the previous day. Bucketing by UTC would scatter Indian late-evening
  // activity across two days and make the "Last 7 days" chart wrong at both
  // ends. The date is therefore computed in the app's timezone on write.
  //
  // Stored as `date`, which TypeORM reads back as a 'YYYY-MM-DD' string -
  // the same convention as AspirantProfile.dateOfBirth.
  @Column({ name: 'activity_date', type: 'date' })
  activityDate: string;

  @CreateDateColumn({ name: 'first_seen_at', type: 'timestamptz' })
  firstSeenAt: Date;

  // Moved forward at most once per ACTIVITY_REFRESH_MINUTES, so this is
  // accurate to within that window rather than to the second. See
  // ActivityService.recordActivity for why.
  @Column({ name: 'last_seen_at', type: 'timestamptz' })
  lastSeenAt: Date;
}
