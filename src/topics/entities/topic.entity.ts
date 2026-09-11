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
import { Subject } from '../../subjects/entities/subject.entity';

/**
 * A topic inside a subject - "Fundamental Rights" under "Indian
 * Constitution". Global like its subject: mapped to exams through the
 * syllabus, never copied per exam.
 */
@Index('UQ_topics_subject_name_active', ['subjectId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Entity({ name: 'topics' })
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
