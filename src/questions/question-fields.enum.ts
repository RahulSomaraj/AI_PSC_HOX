/**
 * Where a question is in editing, as the Question Bank draws it.
 *
 * Separate from `isActive`, which stays the retire flag. A question can be
 * a published question that has since been retired; the two are different
 * facts and `isActive` cannot hold three states (BACKEND_ISSUES.md P1-1).
 */
export enum QuestionStatus {
  Draft = 'draft',
  PendingReview = 'pending-review',
  Published = 'published',
}

/** One record carries one language. */
export enum QuestionLanguage {
  English = 'en',
  Malayalam = 'ml',
}

/**
 * The past-paper kind of a question.
 *
 * Declared so a request carrying it validates, but **not stored** - see
 * CreateQuestionDto.type. The Add Question form has no field for it, so
 * every question the console saves sends null (BACKEND_ISSUES.md P1-1,
 * rows 6-8, Q33).
 */
export enum QuestionType {
  Prelims = 'prelims',
  Mains = 'mains',
  MockTest = 'mock-test',
}
