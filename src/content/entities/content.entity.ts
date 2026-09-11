import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Batch } from '../../batches/entities/batch.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { Subtopic } from '../../subtopics/entities/subtopic.entity';
import { ContentType } from '../content-type.enum';

/**
 * One item in the study library - a set of notes, a lecture video, a
 * circular worth keeping.
 *
 * Filed against the same subject/topic/subtopic taxonomy questions use, so
 * "you are weak at Indian Polity" can one day become "here is the material
 * for it" without a second classification scheme.
 */
@Index('IDX_content_subject_id', ['subjectId'])
@Index('IDX_content_is_published', ['isPublished'])
@Entity({ name: 'content' })
export class Content {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20 })
  type: ContentType;

  /**
   * Where the material actually is. Exactly one of these is set.
   *
   * `fileUrl` is the `fileUrl` handed back by `POST /uploads` - something in
   * our own bucket. `sourceUrl` is somewhere else entirely: a YouTube
   * lecture, a PSC circular on a government site. Keeping them in separate
   * columns rather than one `url` means a later feature - re-hosting,
   * link-rot checks, signed reads for private material - can tell the two
   * apart without guessing from the hostname.
   */
  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string | null;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl: string | null;

  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId: number | null;

  @ManyToOne(() => Topic, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;

  @Column({ name: 'subtopic_id', type: 'int', nullable: true })
  subtopicId: number | null;

  @ManyToOne(() => Subtopic, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'subtopic_id' })
  subtopic: Subtopic | null;

  /**
   * Which batches the item is restricted to. **Empty means every student.**
   *
   * Many-to-many because the admin form attaches an item to several batches
   * at once. Shaped exactly like `faculty_batches` so the two read the same
   * way, and RESTRICT for the same reason: a batch with material attached
   * should not be hard-deleted out from under it.
   */
  @ManyToMany(() => Batch, { onDelete: 'RESTRICT' })
  @JoinTable({
    name: 'content_batches',
    joinColumn: { name: 'content_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'batch_id', referencedColumnName: 'id' },
  })
  batches: Batch[];

  /** Students see published items only. Authors and admins see both. */
  @Column({ name: 'is_published', type: 'boolean', default: false })
  isPublished: boolean;

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
