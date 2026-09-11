/**
 * What a file is being uploaded for.
 *
 * The purpose is not decoration: it selects the key prefix, the accepted
 * content types and the size ceiling in `UPLOADS_POLICY`. A caller cannot
 * name an arbitrary folder, which keeps the bucket laid out predictably and
 * keeps a crafted `folder` out of the object key.
 */
export enum UploadPurpose {
  /** Content Library files - notes, PDFs, slide decks, lecture video. */
  Content = 'content',

  /** Images embedded in a question or its options. */
  Question = 'question',

  /** Profile pictures. */
  Avatar = 'avatar',
}
