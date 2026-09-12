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
import { Content } from '../../content/entities/content.entity';
import { Batch } from '../../batches/entities/batch.entity';

// One row per content open, by anyone, ever.
//
// The same shape of gap the answer log filled for questions: `content` has
// no view counter and no event table, so Reports -> Content Usage has
// nothing to aggregate. See API_CONTRACT.md, "Content Usage - not built".
//
// One path writes here:
//   - ContentService.findOne() - the only read that opens a single item
//
// No audit actor columns and no soft delete, matching AnswerLog and
// UserActivity: a row is a fact about something that happened, not a record
// anyone edits. It is only ever inserted.

// Views per item, over time - the Content Usage tab's main series.
@Index('IDX_content_view_content_viewed', ['contentId', 'viewedAt'])
// Views per subject, which the index above cannot serve.
@Index('IDX_content_view_subject', ['subjectId'])
// Views per batch, the third grouping the tab asks for.
@Index('IDX_content_view_batch', ['batchId'])
// One user's recent opens, newest first - the Student profile's Recently
// Viewed Content panel (`GET /users/:id/recent-content`).
@Index('IDX_content_view_user_viewed', ['userId', 'viewedAt'])
@Entity({ name: 'content_view' })
export class ContentView {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'content_id', type: 'int' })
  contentId: number;

  // RESTRICT. `ContentService.remove()` is a soft delete, which never fires
  // a foreign key, so this constraint only ever refuses a *hard* delete -
  // which is exactly right: erasing an item should not silently erase the
  // record that students read it.
  @ManyToOne(() => Content, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'content_id' })
  content: Content;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  // CASCADE, matching AnswerLog and UserActivity: a view is meaningless once
  // the user row is genuinely gone. A soft-deleted user keeps their history,
  // since a soft delete does not fire the constraint.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  /**
   * The item's subject, copied in at write time.
   *
   * Denormalised for the same reason `answer_log` denormalises its three
   * taxonomy ids: Content Usage groups by subject, and re-joining `content`
   * on every aggregate will not hold up. It also keeps the figure honest -
   * re-filing an item under a different subject next term does not rewrite
   * what was true when it was read.
   */
  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  /**
   * The batch the **reader** was in, copied in at write time. Null if they
   * were in none.
   *
   * Deliberately the reader's batch, not the item's: an item can be attached
   * to several batches at once, so "views per batch" can only mean which
   * cohorts are actually consuming material. Copied in for the same reason
   * as the subject - a student moving to next year's batch must not silently
   * rewrite last term's usage.
   */
  @Column({ name: 'batch_id', type: 'int', nullable: true })
  batchId: number | null;

  @ManyToOne(() => Batch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch | null;

  @CreateDateColumn({ name: 'viewed_at', type: 'timestamptz' })
  viewedAt: Date;
}
