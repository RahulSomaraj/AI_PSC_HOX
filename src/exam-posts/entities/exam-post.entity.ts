import {
  Column,
  CreateDateColumn,
<<<<<<< HEAD
  DeleteDateColumn,
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ExamLevel } from '../../exam-levels/entities/exam-level.entity';

<<<<<<< HEAD
/**
 * An exam / post advertised under an exam level - "Sub Inspector of Police",
 * "Secretariat Assistant", "LDC". Served under the `/exams` routes.
 *
 * The class is `ExamPost` and the table is `exam_posts` because the name
 * `Exam` / table `exams` is already taken by the attempt-session entity in
 * `src/exam` (a user's run through a set of questions). Those are two
 * different things and the attempt table holds live data, so this catalog
 * entity gets its own name rather than colliding with it. The foreign keys
 * pointing here are still called `examId`, matching the domain language.
 */
@Index('UQ_exam_posts_level_name_active', ['examLevelId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'exam_posts' })
export class ExamPost {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
  @Column({ name: 'exam_level_id', type: 'int' })
  examLevelId: number;

  @ManyToOne(() => ExamLevel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_level_id' })
  examLevel: ExamLevel;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'short_name', type: 'varchar', length: 50, nullable: true })
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  shortName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

<<<<<<< HEAD
  @Column({ type: 'varchar', length: 200, nullable: true })
  department: string | null;

  @Column({ type: 'text', nullable: true })
  qualification: string | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  deletedBy: number | null;
}
