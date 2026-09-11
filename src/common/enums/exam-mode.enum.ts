/**
 * How an exam stage is conducted. Stored as a varchar (not a Postgres enum)
 * so that new modes can be added without an ALTER TYPE migration.
 */
export enum ExamMode {
  Objective = 'objective',
  Descriptive = 'descriptive',
  Practical = 'practical',
  Physical = 'physical',
  Interview = 'interview',
  DocumentVerification = 'document_verification',
  Other = 'other',
}
