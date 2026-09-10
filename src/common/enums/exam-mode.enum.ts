<<<<<<< HEAD
/**
 * How an exam stage is conducted. Stored as a varchar (not a Postgres enum)
 * so that new modes can be added without an ALTER TYPE migration.
 */
=======
// How a stage is conducted. The seven values are fixed by
// architecture.md - a stage is one of these, or 'other'.
//
// Stored as a varchar rather than a Postgres enum type, matching Role and
// BatchShift. Under synchronize: true that keeps adding a mode a code change
// instead of an ALTER TYPE against a live database.
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
export enum ExamMode {
  Objective = 'objective',
  Descriptive = 'descriptive',
  Practical = 'practical',
  Physical = 'physical',
  Interview = 'interview',
  DocumentVerification = 'document_verification',
  Other = 'other',
}
