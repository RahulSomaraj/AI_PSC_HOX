import {
  Column,
  CreateDateColumn,
<<<<<<< HEAD
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExamPost } from '../../exam-posts/entities/exam-post.entity';
import { BatchMode } from '../../common/enums/batch-mode.enum';
import { BatchStatus } from '../../common/enums/batch-status.enum';

/**
 * A batch is a cohort of aspirants coached together for one exam over a
 * fixed period - "Alpha Batch 2025", targeting LDC, online, Jan to Dec.
 *
 * The target exam is an `exam_posts` row, so a batch hangs off the same
 * catalog as stages and syllabi. The FK is called `examId` to match the
 * domain language used by `exam_stages` and `exam_syllabi`.
 *
 * Partial unique index: a batch name may only be live once, but a
 * soft-deleted row keeps its name so next year's intake can reuse it.
 */
@Index('UQ_batches_name_active', ['name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
=======
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum BatchShift {
  Morning = 'Morning',
  Evening = 'Evening',
}

// A batch is a named group of students sitting a shift, shown as
// "Batch A (Morning)" on the students screen.
//
// Partial unique index on (name, shift): the same name may run in both
// shifts, but not twice in one. Scoped to live rows, so a soft-deleted
// batch frees its name for reuse.
@Index('UQ_batches_name_shift_active', ['name', 'shift'], {
  unique: true,
  where: '"deletedAt" IS NULL',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'batches' })
export class Batch {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'exam_id', type: 'int' })
  examId: number;

  @ManyToOne(() => ExamPost, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_id' })
  exam: ExamPost;

  @Column({ type: 'varchar', length: 20 })
  mode: BatchMode;

  /**
   * Head count shown in the admin list. Stored rather than derived because
   * there is no batch membership table yet - once aspirants are linked to a
   * batch this should become a COUNT over that join instead.
   */
  @Column({ name: 'student_count', type: 'int', default: 0 })
  studentCount: number;

  @Column({ name: 'start_date', type: 'date' })
  startDate: string;

  @Column({ name: 'end_date', type: 'date' })
  endDate: string;

  @Column({ type: 'varchar', length: 20, default: BatchStatus.Upcoming })
  status: BatchStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
=======
  @Column({ length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20 })
  shift: BatchShift;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  deletedBy: number | null;
}
