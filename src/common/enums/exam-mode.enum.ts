// How a stage is conducted. The seven values are fixed by
// architecture.md - a stage is one of these, or 'other'.
//
// Stored as a varchar rather than a Postgres enum type, matching Role and
// BatchShift. Under synchronize: true that keeps adding a mode a code change
// instead of an ALTER TYPE against a live database.
export enum ExamMode {
  Objective = 'objective',
  Descriptive = 'descriptive',
  Practical = 'practical',
  Physical = 'physical',
  Interview = 'interview',
  DocumentVerification = 'document_verification',
  Other = 'other',
}
