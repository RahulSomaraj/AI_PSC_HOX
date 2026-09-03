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
import { ExamSyllabus } from './exam-syllabus.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { Subtopic } from '../../subtopics/entities/subtopic.entity';
import { SyllabusPriority } from '../../common/enums/syllabus-priority.enum';
import { DecimalTransformer } from '../../common/transformers/decimal.transformer';

/**
 * One line of a syllabus. It points at shared academic rows, so the same
 * "Indian Constitution / Fundamental Rights / Article 21" is reused by every
 * exam that needs it.
 *
 * An item can be mapped at three depths:
 *   subject only            -> the whole subject is in the syllabus
 *   subject + topic         -> only that topic
 *   subject + topic + sub   -> only that subtopic
 *
 * Rows are hard-deleted: they are a mapping, not a record worth keeping
 * after it is removed from the syllabus.
 *
 * The three partial unique indexes stop the same combination being added
 * twice. They have to be split by depth because Postgres treats NULLs in a
 * unique index as distinct values, so a single index over the nullable
 * columns would happily accept duplicates.
 */
@Index('UQ_syllabus_item_subject', ['syllabusId', 'subjectId'], {
  unique: true,
  where: '"topic_id" IS NULL AND "subtopic_id" IS NULL',
})
@Index('UQ_syllabus_item_topic', ['syllabusId', 'subjectId', 'topicId'], {
  unique: true,
  where: '"topic_id" IS NOT NULL AND "subtopic_id" IS NULL',
})
@Index(
  'UQ_syllabus_item_subtopic',
  ['syllabusId', 'subjectId', 'topicId', 'subtopicId'],
  { unique: true, where: '"subtopic_id" IS NOT NULL' },
)
@Entity({ name: 'exam_syllabus_items' })
export class ExamSyllabusItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'syllabus_id', type: 'int' })
  syllabusId: number;

  @ManyToOne(() => ExamSyllabus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'syllabus_id' })
  syllabus: ExamSyllabus;

  @Column({ name: 'subject_id', type: 'int' })
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId: number | null;

  @ManyToOne(() => Topic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topic_id' })
  topic: Topic | null;

  @Column({ name: 'subtopic_id', type: 'int', nullable: true })
  subtopicId: number | null;

  @ManyToOne(() => Subtopic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subtopic_id' })
  subtopic: Subtopic | null;

  @Column({
    type: 'varchar',
    length: 10,
    default: SyllabusPriority.Medium,
  })
  priority: SyllabusPriority;

  @Column({
    name: 'marks_weightage',
    type: 'numeric',
    precision: 6,
    scale: 2,
    nullable: true,
    transformer: DecimalTransformer,
  })
  marksWeightage: number | null;

  @Column({ name: 'question_weightage', type: 'int', nullable: true })
  questionWeightage: number | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @Column({ name: 'created_by', type: 'int', nullable: true })
  createdBy: number | null;

  @Column({ name: 'updated_by', type: 'int', nullable: true })
  updatedBy: number | null;
}
