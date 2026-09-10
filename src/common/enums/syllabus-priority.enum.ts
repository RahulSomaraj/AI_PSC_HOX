<<<<<<< HEAD
/**
 * How important a syllabus item is for a given exam stage. Drives study
 * planning and, later, question generation weightage.
 */
=======
// How much weight a syllabus item carries in preparation - the three values
// architecture.md fixes for exam_syllabus_items.priority.
//
// Distinct from marksWeightage and questionWeightage on the same row: those
// are the exam's own numbers where they are published, while this is the
// coaching judgement of what to spend time on, and is always set.
//
// Stored as a varchar rather than a Postgres enum type, matching ExamMode,
// Role and BatchShift.
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
export enum SyllabusPriority {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}
