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
import { Topic } from '../../topics/entities/topic.entity';

// A subtopic is a division of one topic, and the finest depth a syllabus
// item can map to. Like subjects and topics, subtopics are global.
//
// Partial unique index: the name is unique within its topic while the row is
// live, so a soft-deleted subtopic frees its name for reuse.
@Index('UQ_subtopics_topic_name_active', ['topicId', 'name'], {
  unique: true,
  where: '"deletedAt" IS NULL',
})
@Entity({ name: 'subtopics' })
export class Subtopic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  topicId: number;

  // RESTRICT: a topic holding subtopics cannot be hard-deleted out from
  // under them.
  @ManyToOne(() => Topic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topicId' })
  topic: Topic;

  @Column({ length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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
  deletedBy: number | null;
}
