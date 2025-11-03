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


