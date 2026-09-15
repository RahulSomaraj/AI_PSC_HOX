/**
 * How a notification reached students.
 *
 * Only `app-push` is ever written today: an announcement is stored and read
 * in the app, and nothing sends SMS or email. The other two are declared
 * because the console's list draws a Channel column with all three, so the
 * type is ready for a sender without a schema change.
 */
export enum NotificationChannel {
  AppPush = 'app-push',
  Sms = 'sms',
  Email = 'email',
}

/**
 * Whether delivery worked.
 *
 * Always `sent` today. An in-app announcement cannot fail to deliver - it is
 * a row students read. `failed` becomes reachable only once a real SMS or
 * email sender exists and reports back.
 */
export enum NotificationStatus {
  Sent = 'sent',
  Failed = 'failed',
}

export enum NotificationLanguage {
  English = 'en',
  Malayalam = 'ml',
}

/**
 * The console's name for "every student", sent as `target` on create and
 * returned as `target` for a notification that went to no particular batch.
 */
export const ALL_STUDENTS = 'All Students';
