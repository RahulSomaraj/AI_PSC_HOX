import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../users/entities/user.entity';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  @Column({ type: 'text' })
  question: string;

  @Column({ type: 'json' })
  answers: string[]; // Array of 4 shuffled answer choices

  @Column()
  correctAnswer: string; // The correct answer (must be in answers array)

  @Column({ type: 'text', nullable: true })
  description: string; // Detailed description of the question

  @Column({ type: 'text', nullable: true })
  descriptionLink: string; // Link to detailed web page

  @Column({ type: 'int', default: 1 })
  difficulty: number; // 1-5 difficulty level

  @Column({ type: 'int', default: 10 })
  points: number; // Points awarded for correct answer

  @Column({ type: 'text', nullable: true })
  explanation: string; // Explanation of the correct answer

  @Column({ type: 'json', nullable: true })
  tags: string[]; // Tags for categorization

  @Column({ default: true })
  isActive: boolean; // Whether the question is active

  @Column()
  createdBy: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column({ nullable: true })
  updatedBy: number;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'updatedBy' })
  updater: User;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
