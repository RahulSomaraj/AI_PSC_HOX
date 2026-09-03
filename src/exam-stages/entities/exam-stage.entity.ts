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
import { ExamMode } from '../../common/enums/exam-mode.enum';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

/**
 * One stage of an exam - "Preliminary Examination", "Main Examination",
 * "Physical Efficiency Test", "Document Verification". Stages are data, not
 * code: an exam may have any number of them, in any order.
 *
 * A syllabus hangs off a stage, not off the exam, because the prelims and
 * the mains of the same post cover different ground.
 */
@Index('UQ_exam_stages_exam_name_active', ['examId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Entity({ name: 'exam_stages' })
export class ExamStage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id', type: 'int' })
  examId: number;

  @ManyToOne(() => ExamPost, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_id' })
  exam: ExamPost;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ name: 'stage_order', type: 'int', default: 1 })
  stageOrder: number;

  @Column({ name: 'exam_mode', type: 'varchar', length: 30, nullable: true })
  examMode: ExamMode | null;

  @Column({ name: 'total_questions', type: 'int', nullable: true })
  totalQuestions: number | null;

  @Column({
    name: 'total_marks',
    type: 'numeric',
    precision: 8,
    scale: 2,
    nullable: true,
    transformer: DecimalTransformer,
  })
  totalMarks: number | null;

  @Column({ name: 'duration_minutes', type: 'int', nullable: true })
  durationMinutes: number | null;

  @Column({
    name: 'negative_mark',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: DecimalTransformer,
  })
  negativeMark: number | null;

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
