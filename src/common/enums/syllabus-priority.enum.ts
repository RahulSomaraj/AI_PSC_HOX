// How much weight a syllabus item carries in preparation - the three values
// architecture.md fixes for exam_syllabus_items.priority.
//
// Distinct from marksWeightage and questionWeightage on the same row: those
// are the exam's own numbers where they are published, while this is the
// coaching judgement of what to spend time on, and is always set.
//
// Stored as a varchar rather than a Postgres enum type, matching ExamMode,
// Role and BatchShift.
export enum SyllabusPriority {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}
