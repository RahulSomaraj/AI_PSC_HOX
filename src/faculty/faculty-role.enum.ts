// Job titles are separate from account permissions. Staff are never admins.
export enum FacultyRole {
  Teacher = 'teacher',
  Reviewer = 'reviewer',
  ContentCreator = 'content_creator',
}

/** One role as a dropdown needs it: the stored value, and what to show. */
export interface FacultyRoleOption {
  value: FacultyRole;
  label: string;
}

/**
 * Display label for every role.
 *
 * A `Record` keyed by the enum rather than a list of pairs: adding a member
 * to `FacultyRole` without labelling it here is a compile error, so a new
 * role cannot reach the database while staying invisible in the dropdowns
 * that write it.
 */
export const FACULTY_ROLE_LABELS: Record<FacultyRole, string> = {
  [FacultyRole.Teacher]: 'Teacher',
  [FacultyRole.Reviewer]: 'Reviewer',
  [FacultyRole.ContentCreator]: 'Content Creator',
};

/**
 * The labelled roles, in the order they are declared above.
 *
 * Built from `Object.values(FacultyRole)` rather than written out a second
 * time, because both `GET /settings/roles` and the `roles` key of
 * `GET /faculty/options` serve it and the two must not drift.
 */
export const FACULTY_ROLE_OPTIONS: readonly FacultyRoleOption[] = Object.values(
  FacultyRole,
).map((value) => ({
  value,
  label: FACULTY_ROLE_LABELS[value],
}));
