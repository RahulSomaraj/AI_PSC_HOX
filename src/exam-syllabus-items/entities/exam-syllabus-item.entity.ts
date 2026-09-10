import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ExamSyllabus } from '../../exam-syllabi/entities/exam-syllabus.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { Subtopic } from '../../subtopics/entities/subtopic.entity';
import { SyllabusPriority } from '../../common/enums/syllabus-priority.enum';

// One line of a syllabus: a pointer into the academic taxonomy at one of
// three depths - a whole subject, one topic of it, or one subtopic of that.
// Never a copy: "Indian Constitution" stays one subjects row that every
// syllabus reaches through an item like this one.
//
// Three unique indexes rather than one, because Postgres treats NULLs in a
// unique index as distinct: a single index on (syllabusId, subjectId,
// topicId, subtopicId) would let the same subject-only mapping be inserted
// any number of times, since NULL never equals NULL. So each depth gets its
// own index, with a predicate selecting the rows at that depth.
//
// No "deletedAt IS NULL" in the predicates: an item is hard-deleted, so
// there is no dead row to exclude.
@Index('UQ_exam_syllabus_items_subject', ['syllabusId', 'subjectId'], {
  unique: true,
  where: '"topicId" IS NULL AND "subtopicId" IS NULL',
})
@Index(
  'UQ_exam_syllabus_items_topic',
  ['syllabusId', 'subjectId', 'topicId'],
  {
    unique: true,
    where: '"topicId" IS NOT NULL AND "subtopicId" IS NULL',
  },
)
@Index(
  'UQ_exam_syllabus_items_subtopic',
  ['syllabusId', 'subjectId', 'topicId', 'subtopicId'],
  {
    unique: true,
    where: '"subtopicId" IS NOT NULL',
  },
)
@Entity({ name: 'exam_syllabus_items' })
export class ExamSyllabusItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  syllabusId: number;

  // CASCADE, unlike every other FK in this hierarchy: an item is a mapping,
  // not a record worth keeping once its syllabus is gone. That covers hard
  // deletes only - ExamSyllabiService.remove() refuses to soft-delete a
  // syllabus that still holds items, so a recoverable parent never outlives
  // unrecoverable children.
  @ManyToOne(() => ExamSyllabus, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'syllabusId' })
  syllabus: ExamSyllabus;

  // Required. The other two narrow it, and may only be set from the top
  // down: a topic needs a subject, a subtopic needs a topic, and each must
  // belong to the one above it. ExamSyllabusItemsService enforces that.
  @Column()
  subjectId: number;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

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

  // What to spend time on. Always set, unlike the two weightages below,
  // which carry the exam's published numbers where those exist.
  @Column({ type: 'varchar', length: 10, default: SyllabusPriority.Medium })
  priority: SyllabusPriority;

  // numeric, not float: a published weightage of 12.5% must not drift. The
  // pg driver reads and writes numeric as a string to preserve that.
  @Column({ type: 'numeric', precision: 5, scale: 2, nullable: true })
  marksWeightage: string | null;

  @Column({ type: 'int', nullable: true })
  questionWeightage: number | null;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // The only audit column on this table, per architecture.md: items are
  // hard-deleted, so there is no deletedAt, and no updatedAt or actor
  // columns either. Everything else in both hierarchies carries all six.
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;
}
