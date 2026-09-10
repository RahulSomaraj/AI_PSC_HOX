import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Course } from '../../course/entities/course.entity';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { Subtopic } from '../../subtopics/entities/subtopic.entity';

@Entity({ name: 'questions' })
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  courseId: number;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'courseId' })
  course: Course;

  // Where this question sits in the academic hierarchy: subject -> topic ->
  // subtopic. All three nullable, and independently so - a question may be
  // tagged to a subject only, a subject and topic, or all three. What is not
  // allowed is a gap: a topic without a subject, or a subtopic without a
  // topic. QuestionsService enforces that on create and update, along with
  // each id actually belonging to the one above it.
  //
  // Nullable also lets synchronize add the columns to a populated table;
  // existing questions stay untagged until someone classifies them.
  //
  // RESTRICT: a subject, topic or subtopic with questions tagged to it
  // cannot be hard-deleted out from under them. The three services enforce
  // the same rule for soft deletes, which the constraint does not cover.
  @Column({ type: 'int', nullable: true })
  subjectId: number | null;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject | null;

  @Column({ type: 'int', nullable: true })
  topicId: number | null;

  @ManyToOne(() => Topic, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'topicId' })
  topic: Topic | null;

  @Column({ type: 'int', nullable: true })
  subtopicId: number | null;

  @ManyToOne(() => Subtopic, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'subtopicId' })
  subtopic: Subtopic | null;

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
