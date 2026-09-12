/**
 * What kind of material a library item is.
 *
 * These four are exactly what the Add Content form offers, per
 * `BACKEND_ISSUES.md` P2-5. A label for filtering and for choosing an icon,
 * not a constraint on what the item points at: a `Video` can be an uploaded
 * mp4 or a YouTube link, and the reader should not care which.
 *
 * The Content Library list also renders an `article` type that the form
 * cannot create. That is their open Q40, not a fifth value - adding it here
 * would let the API store something no screen can produce.
 */
export enum ContentType {
  Video = 'video',
  Pdf = 'pdf',
  Notes = 'notes',
  Links = 'links',
}

/**
 * Whether students can see the item.
 *
 * A two-value enum rather than a boolean because that is the shape the
 * console was built against, and because a third state - `archived`, say -
 * is a realistic ask that a boolean cannot grow into.
 *
 * Everything the console saves is a draft today: the form has one "Save
 * Content" button and no way to choose. Publishing is `PATCH /content/:id`.
 */
export enum ContentStatus {
  Draft = 'draft',
  Published = 'published',
}
