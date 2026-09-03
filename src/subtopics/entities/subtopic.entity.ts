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
import { Topic } from '../../topics/entities/topic.entity';

/**
 * The leaf of the academic structure - "Article 21" under "Fundamental
 * Rights". Reusable across every exam that maps it.
 */
@Index('UQ_subtopics_topic_name_active', ['topicId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Entity({ name: 'subtopics' })
export class Subtopic {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'topic_id', type: 'int' })
  topicId: number;

  @ManyToOne(() => Topic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

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
