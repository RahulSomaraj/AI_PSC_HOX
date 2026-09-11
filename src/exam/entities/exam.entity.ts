import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Course } from '../../course/entities/course.entity';
import { ExamStage } from '../../exam-stages/entities/exam-stage.entity';

@Entity({ name: 'exams' })
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  // Which catalogue sitting this attempt was made against, or null for a
  // free-standing practice attempt.
  //
  // A stage rather than an exam post: the post is the exam as advertised
  // ("Kerala PSC LDC"), the stage is the sitting anyone actually takes
  // ("Prelims"), and it is the stage that carries a question count, marks
  // and a duration. Results are comparable within a stage, not across a post.
  //
  // Nullable, and it has to stay that way. Every attempt made before this
  // column existed is null and cannot be repaired: an attempt row records a
  // course and a set of question IDs, and neither identifies a catalogue
  // exam. Unlike the answer-log backfill there is no source to reconstruct
  // from, so GET /exams/:id/results covers attempts created after this
  // shipped and nothing earlier.
  //
  // RESTRICT, matching exam_stages -> exam_posts: a stage with attempts
  // filed against it is one whose results someone can still read, so
  // deleting it out from under them is refused rather than cascaded.
  @Column({ name: 'exam_stage_id', type: 'int', nullable: true })
  examStageId: number | null;

  @ManyToOne(() => ExamStage, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'exam_stage_id' })
  examStage: ExamStage | null;

  // The name the attempt is shown under - "LDC Weekly Mock Test" in the Mock
  // Test Scores panel on the student profile. Without it a panel row can only
  // be labelled by its course, which is the same string for every attempt a
  // student makes on that course.
  //
  // Nullable so synchronize can add the column to a table that already holds
  // attempts; those keep null and fall back to the course name for display.
  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'json' })
  questionIds: number[]; // Array of question IDs in the exam

  @Column({ type: 'int', default: 30 })
  maxQuestions: number; // Maximum number of questions (default 30)

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'json', nullable: true })
  answers: Record<number, string>; // Map of questionId -> selected answer

  @Column({ type: 'int', nullable: true })
  score: number | null; // Total score achieved

  @Column({ type: 'int', nullable: true })
  totalPossibleScore: number | null; // Total possible score

  @Column({ type: 'enum', enum: ['pending', 'in_progress', 'completed', 'expired'], default: 'pending' })
  status: 'pending' | 'in_progress' | 'completed' | 'expired';

  @Column({ type: 'int', nullable: true })
  durationMinutes: number | null; // Exam duration in minutes

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}


