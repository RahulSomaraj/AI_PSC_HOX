import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Batch } from '../../batches/entities/batch.entity';

/**
 * An announcement an admin sends to students - "Friday's class is moved",
 * "LDC results are out".
 *
 * One row per announcement, not one row per recipient. A notification to a
 * 400-student batch is a single row, and the fan-out happens at read time
 * from `batch_id`. Writing 400 rows would buy a per-recipient read flag,
 * which nothing needs yet - there is no unread badge in this iteration - at
 * the cost of a table that grows with students x announcements.
 *
 * That trade is worth revisiting the moment read tracking is specified: a
 * per-recipient `notification_recipients` table is the usual answer, and it
 * can be added alongside this one without changing what is here.
 */
@Index('IDX_notifications_batch_id', ['batchId'])
@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  body: string;

  /**
   * Who it is for: a batch id, or NULL for every student.
   *
   * RESTRICT rather than CASCADE, matching `aspirant_profiles.batch_id`: a
   * batch with announcements against it should not be hard-deleted out from
   * under them. Batches are soft-deleted in normal operation anyway.
   */
  @Column({ name: 'batch_id', type: 'int', nullable: true })
  batchId: number | null;

  @ManyToOne(() => Batch, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'batch_id' })
  batch: Batch | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;

  @Column({ name: 'deleted_by', type: 'int', nullable: true })
  deletedBy: number | null;
}
