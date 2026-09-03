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
import { ExamPost } from '../../exam-posts/entities/exam-post.entity';
import { ExamStage } from '../../exam-stages/entities/exam-stage.entity';

/**
 * The syllabus of one exam stage. It is the bridge between the exam
 * structure (level -> exam -> stage) and the global academic structure
 * (subject -> topic -> subtopic); the academic rows themselves are shared
 * and never copied per exam.
 *
 * `examId` is stored alongside `examStageId` so the syllabus can be listed
 * for a whole exam without a join; the service keeps the two consistent by
 * rejecting a stage that does not belong to the exam.
 *
 * One live syllabus per stage - the partial unique index lets a
 * soft-deleted syllabus stay in the table without blocking a new one.
 */
@Index('UQ_exam_syllabi_stage_active', ['examStageId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Entity({ name: 'exam_syllabi' })
export class ExamSyllabus {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id', type: 'int' })
  examId: number;

  @ManyToOne(() => ExamPost, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_id' })
  exam: ExamPost;

  @Column({ name: 'exam_stage_id', type: 'int' })
  examStageId: number;

  @ManyToOne(() => ExamStage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_stage_id' })
  examStage: ExamStage;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
