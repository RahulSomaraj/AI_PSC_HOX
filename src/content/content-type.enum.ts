/**
 * What kind of material a library item is.
 *
 * A label for filtering and for choosing an icon, not a constraint on what
 * the item points at: a `Video` can be an uploaded mp4 or a YouTube link,
 * and the reader should not care which.
 */
export enum ContentType {
  Note = 'note',
  Video = 'video',
  Document = 'document',
}
