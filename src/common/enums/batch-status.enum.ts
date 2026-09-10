/**
 * Lifecycle of a batch as shown in the admin list.
 *
 * `upcoming` and `ongoing` describe where the batch is against its own
 * dates; `active` and `inactive` describe whether the admin wants it live at
 * all. They share one column because the UI shows them in a single Status
 * column, and it is set explicitly rather than derived so an admin can pull a
 * batch off the list without touching its dates.
 */
export enum BatchStatus {
  Active = 'active',
  Ongoing = 'ongoing',
  Upcoming = 'upcoming',
  Inactive = 'inactive',
}
