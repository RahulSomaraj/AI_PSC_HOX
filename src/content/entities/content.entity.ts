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
import { ExamLevel } from '../../exam-levels/entities/exam-level.entity';
import { ContentStatus, ContentType } from '../content-type.enum';

/**
 * One item in the study library - a set of notes, a lecture video, a
 * circular worth keeping.
 *
 * The field names and the two enums follow `BACKEND_ISSUES.md` P2-5, which
 * the console's Content Library screens were built and tested against.
 *
 * `topicId` and `subtopicId` go beyond that shape deliberately. Questions
 * are tagged to subtopic depth, and Weak Subjects rolls up by subject; if
 * content were filed only to subject and exam level, "you are weak on
 * Fundamental Rights, here is the material" could never be built - only the
 * far blunter "you are weak on Indian Polity". They are nullable extras, so
 * a client that ignores them sees exactly the P2-5 shape.
 */
@Index('IDX_content_subject_id', ['subjectId'])
@Index('IDX_content_exam_level_id', ['examLevelId'])
@Index('IDX_content_status', ['status'])
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
   * our own bucket. `linkUrl` is somewhere else entirely: a YouTube lecture,
   * a PSC circular on a government site. Keeping them in separate columns
   * rather than one `url` means a later feature - re-hosting, link-rot
   * checks, signed reads for private material - can tell the two apart
   * without guessing from the hostname.
   */
  @Column({ name: 'file_url', type: 'text', nullable: true })
  fileUrl: string | null;

  /** The name to show once a file is attached. Null for a link. */
  @Column({ name: 'file_name', type: 'varchar', length: 255, nullable: true })
  fileName: string | null;

  @Column({ name: 'link_url', type: 'text', nullable: true })
  linkUrl: string | null;

  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId: number | null;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject | null;

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

  @Column({ name: 'exam_level_id', type: 'int', nullable: true })
  examLevelId: number | null;

  @ManyToOne(() => ExamLevel, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'exam_level_id' })
  examLevel: ExamLevel | null;

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
  @Column({ type: 'varchar', length: 20, default: ContentStatus.Draft })
  status: ContentStatus;

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
