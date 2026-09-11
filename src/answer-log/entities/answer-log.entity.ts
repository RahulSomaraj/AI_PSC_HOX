import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Question } from '../../questions/entities/question.entity';
import { Exam } from '../../exam/entities/exam.entity';

// One row per question answered, by anyone, ever.
//
// This is the grain the analytics need and nothing else records. An exam row
// stores a total score and an `answers` JSON blob; neither says which
// subject a student is weak in. Weak Subjects, average accuracy and the
// per-question breakdown on the results page all read this table.
//
// Two paths write here:
//   - ExamService.submit()      - one row per question, exam_id set
//   - QuestionsService.answerQuestion() - practice, exam_id null
//
// No audit actor columns and no soft delete, matching UserActivity: a row is
// a fact about something that happened, not a record anyone edits. It is
// only ever inserted.

// One row per question per attempt. Partial, because the uniqueness only
// applies to exam answers - practice is deliberately unconstrained, since
// answering the same question repeatedly is what practice *is*.
//
// It also makes the backfill idempotent: inserts use orIgnore(), so
// answer-log.backfill.ts can be re-run or run in stages without duplicating.
@Index('UQ_answer_log_exam_question', ['examId', 'questionId'], {
  unique: true,
  where: '"exam_id" IS NOT NULL',
})
// The student profile reads one user's recent answers; the reports scan a
// user's whole history. Both lead with user_id and order by time.
@Index('IDX_answer_log_user_answered', ['userId', 'answeredAt'])
// Weak Subjects rolls up by subject across all students, which the index
// above cannot serve.
@Index('IDX_answer_log_subject', ['subjectId'])
@Entity({ name: 'answer_log' })
export class AnswerLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', type: 'int' })
  userId: number;

  // CASCADE, matching UserActivity and `exams`: an answer is meaningless
  // once the user row is genuinely gone. A soft-deleted user keeps their
  // history, since a soft delete does not fire the constraint.
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'question_id', type: 'int' })
  questionId: number;

  // RESTRICT, unlike the other two. QuestionsService.remove() is a *hard*
  // delete, and cascading it would erase the answer history of every student
  // who ever sat that question - silently, and with nothing to restore from.
  // So the constraint refuses, and QuestionsService.remove() checks first and
  // reports 409 rather than letting the violation surface as a 500.
  // Deactivating a question (softDelete, isActive = false) is the supported
  // way to retire one.
  @ManyToOne(() => Question, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  // Null for practice answers, which belong to no attempt. That is the only
  // thing distinguishing the two paths, so reports filter on it directly:
  // `exam_id IS NOT NULL` is "answers given under exam conditions".
  @Column({ name: 'exam_id', type: 'int', nullable: true })
  examId: number | null;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam | null;

  // Copied from the question at write time, not joined at read time, and
  // deliberately carrying no foreign key.
  //
  // Two reasons. Immutability: retagging a question must not silently rewrite
  // last quarter's Weak Subjects - what a student answered was tagged to that
  // subject *then*. And cost: the rollup is a GROUP BY on this table alone,
  // with no join to questions.
  //
  // Nullable because questions.subject_id is - an untagged question still
  // produces an answer, it just cannot be rolled up by subject.
  @Column({ name: 'subject_id', type: 'int', nullable: true })
  subjectId: number | null;

  @Column({ name: 'topic_id', type: 'int', nullable: true })
  topicId: number | null;

  @Column({ name: 'subtopic_id', type: 'int', nullable: true })
  subtopicId: number | null;

  // text rather than varchar: this is the answer as the student sent it, and
  // the choices live in a json column with no length bound of their own.
  @Column({ name: 'selected_answer', type: 'text' })
  selectedAnswer: string;

  // Resolved at write time against the question's correctAnswer as it stood
  // then. Stored rather than recomputed for the same reason subject_id is
  // copied: editing a question must not change what a student got right.
  @Column({ name: 'is_correct', type: 'boolean' })
  isCorrect: boolean;

  // Only as good as what the client reports - nothing server-side can time a
  // single question. Null whenever the client sends no timing, which is
  // every request until the frontend starts supplying it.
  @Column({ name: 'time_taken_sec', type: 'int', nullable: true })
  timeTakenSec: number | null;

  // For a live answer this is the moment it was recorded. For a backfilled
  // row it is the insert time, not the original attempt - the historical
  // answers on exams.answers carry no per-answer timestamp. Anything ordering
  // by time across the backfill boundary should use exams.completedAt via
  // exam_id instead.
  @CreateDateColumn({ name: 'answered_at', type: 'timestamptz' })
  answeredAt: Date;
}
