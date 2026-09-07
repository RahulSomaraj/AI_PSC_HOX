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
import { ExamPost } from '../../exam-posts/entities/exam-post.entity';
import { ExamStage } from '../../exam-stages/entities/exam-stage.entity';

// The bridge between the two hierarchies: a syllabus belongs to one stage of
// one exam post, and its items reach into the academic taxonomy - subjects,
// topics, subtopics - without copying any of it.
//
// Partial unique index on examStageId: a stage has at most one live
// syllabus, as architecture.md specifies. Scoped to live rows, so a
// soft-deleted syllabus lets a stage be given a fresh one rather than
// blocking it forever.
@Index('UQ_exam_syllabi_stage_active', ['examStageId'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Entity({ name: 'exam_syllabi' })
export class ExamSyllabus {
  @PrimaryGeneratedColumn()
  id: number;

  // Derivable from the stage, and carried anyway so a syllabus can be found
  // by post without joining through exam_stages. architecture.md calls it
  // "kept in step with the stage", which is a rule rather than a column:
  // ExamSyllabiService rejects a post that is not the stage's own post.
  //
  // Named examPostId, not the doc's exam_id, for the reason the doc itself
  // gives - `exams` is the attempt table, `exam_posts` the catalog.
  @Column()
  examPostId: number;

  @ManyToOne(() => ExamPost, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'examPostId' })
  examPost: ExamPost;

  @Column()
  examStageId: number;

  // RESTRICT: a stage with a syllabus cannot be hard-deleted out from under
  // it. ExamStagesService.remove() enforces the same rule for soft deletes,
  // which the constraint does not cover.
  @ManyToOne(() => ExamStage, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'examStageId' })
  examStage: ExamStage;

  @Column({ length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
