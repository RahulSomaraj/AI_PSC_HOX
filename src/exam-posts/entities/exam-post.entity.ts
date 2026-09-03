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
import { ExamLevel } from '../../exam-levels/entities/exam-level.entity';

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
})
@Entity({ name: 'exam_posts' })
export class ExamPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_level_id', type: 'int' })
  examLevelId: number;

  @ManyToOne(() => ExamLevel, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_level_id' })
  examLevel: ExamLevel;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'short_name', type: 'varchar', length: 50, nullable: true })
  shortName: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
  deletedBy: number | null;
}
