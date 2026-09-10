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
import { ExamPost } from '../../exam-posts/entities/exam-post.entity';
import { ExamMode } from '../../common/enums/exam-mode.enum';
<<<<<<< HEAD
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
=======

// One sitting within an exam post - "Preliminary", "Mains", "Physical
// Efficiency Test", "Interview". The leaf of the exam hierarchy, and what a
// syllabus will hang off once exam_syllabi is built.
//
// Partial unique index: the name is unique within its post while the row is
// live, so a soft-deleted stage frees its name for reuse. Same shape as
// subtopics under topics.
@Index('UQ_exam_stages_post_name_active', ['examPostId', 'name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'exam_stages' })
export class ExamStage {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
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
=======
  // architecture.md calls this column exam_id, but its own comment reads
  // "RESTRICT - to exam_posts", and the doc devotes a section to keeping
  // `exams` (an attempt session) apart from `exam_posts` (the catalog).
  // Naming it examPostId says which table it points at.
  @Column()
  examPostId: number;

  // RESTRICT: a post holding stages cannot be hard-deleted out from under
  // them. ExamPostsService.remove() enforces the same rule for soft
  // deletes, which the constraint does not cover.
  @ManyToOne(() => ExamPost, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'examPostId' })
  examPost: ExamPost;

  @Column({ length: 150 })
  name: string;

  // Which sitting comes first. Not unique per post: the doc calls the order
  // dynamic - stages are data, not code - and an admin reordering a sequence
  // will pass through duplicate values before settling.
  @Column({ type: 'int', default: 0 })
  stageOrder: number;

  @Column({ type: 'varchar', length: 30, default: ExamMode.Objective })
  examMode: ExamMode;

  @Column({ type: 'int', nullable: true })
  totalQuestions: number | null;

  // numeric, not float: these are scored values, and a mark of 0.33 must not
  // drift. The pg driver hands numeric back as a string to preserve exactly
  // that, so the type here is string - parse it at the point of arithmetic
  // rather than letting a float in at the column.
  @Column({ type: 'numeric', precision: 8, scale: 2, nullable: true })
  totalMarks: string | null;

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null;

  // Marks deducted per wrong answer, stored positive - "0.33" means a third
  // of a mark comes off, not that a third is added.
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  negativeMark: string | null;
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1

  @Column({ type: 'text', nullable: true })
  description: string | null;

<<<<<<< HEAD
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
