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
import { Subject } from '../../subjects/entities/subject.entity';

<<<<<<< HEAD
/**
 * A topic inside a subject - "Fundamental Rights" under "Indian
 * Constitution". Global like its subject: mapped to exams through the
 * syllabus, never copied per exam.
 */
@Index('UQ_topics_subject_name_active', ['subjectId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
=======
// A topic is a division of one subject. Like subjects, topics are global -
// every exam reaches a topic through a syllabus item, never a copy of it.
//
// Partial unique index: the name is unique within its subject while the row
// is live, so a soft-deleted topic frees its name for reuse.
@Index('UQ_topics_subject_name_active', ['subjectId', 'name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'topics' })
export class Topic {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ type: 'varchar', length: 200 })
=======
  @Column()
  subjectId: number;

  // RESTRICT: a subject holding topics cannot be hard-deleted out from
  // under them.
  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @Column({ length: 150 })
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

<<<<<<< HEAD
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
=======
  @Column({ type: 'int', default: 0 })
  sortOrder: number;

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
