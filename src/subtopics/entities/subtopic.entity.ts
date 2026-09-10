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
import { Topic } from '../../topics/entities/topic.entity';

<<<<<<< HEAD
/**
 * The leaf of the academic structure - "Article 21" under "Fundamental
 * Rights". Reusable across every exam that maps it.
 */
@Index('UQ_subtopics_topic_name_active', ['topicId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
=======
// A subtopic is a division of one topic, and the finest depth a syllabus
// item can map to. Like subjects and topics, subtopics are global.
//
// Partial unique index: the name is unique within its topic while the row is
// live, so a soft-deleted subtopic frees its name for reuse.
@Index('UQ_subtopics_topic_name_active', ['topicId', 'name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
})
@Entity({ name: 'subtopics' })
export class Subtopic {
  @PrimaryGeneratedColumn()
  id: number;

<<<<<<< HEAD
  @Column({ name: 'topic_id', type: 'int' })
  topicId: number;

  @ManyToOne(() => Topic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @Column({ type: 'varchar', length: 200 })
=======
  @Column()
  topicId: number;

  // RESTRICT: a topic holding subtopics cannot be hard-deleted out from
  // under them.
  @ManyToOne(() => Topic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topicId' })
  topic: Topic;

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
