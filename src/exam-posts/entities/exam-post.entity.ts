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
import { ExamLevel } from '../../exam-levels/entities/exam-level.entity';

// The catalog entry for an exam: the exam as a thing that exists before
// anyone sits it - "Lower Division Clerk", "Sub Inspector of Police".
//
// Not to be confused with the `exams` table, which is an attempt session:
// one row per user's run through a set of questions. Both are live, and
// architecture.md names this one exam_posts precisely because `exams` was
// already taken.
//
// Partial unique index: the name is unique within its level while the row is
// live, so a soft-deleted post frees its name for reuse. Same shape as
// topics under subjects.
@Index('UQ_exam_posts_level_name_active', ['examLevelId', 'name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Entity({ name: 'exam_posts' })
export class ExamPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  examLevelId: number;

  // RESTRICT: a level holding posts cannot be hard-deleted out from under
  // them. ExamLevelsService.remove() enforces the same rule for soft
  // deletes, which the constraint does not cover.
  @ManyToOne(() => ExamLevel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'examLevelId' })
  examLevel: ExamLevel;

  @Column({ length: 150 })
  name: string;

  // The abbreviation the post is commonly known by - "LDC", "SI". Not
  // unique: two levels may both advertise a post abbreviated the same way,
  // and the full name is what the unique index governs.
  @Column({ type: 'varchar', length: 50, nullable: true })
  shortName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  // The government department the post sits in - "Revenue", "Police".
  @Column({ type: 'varchar', length: 150, nullable: true })
  department: string | null;

  // Free text rather than a FK to exam_levels: the level is the band the
  // post is advertised under, while this is the eligibility wording as
  // published, which rarely reduces to one row.
  @Column({ type: 'text', nullable: true })
  qualification: string | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

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
  deletedBy: number | null;
}
