import { UploadPurpose } from './upload-purpose.enum';

export interface UploadPolicy {
  /** First segment of the object key. */
  prefix: string;

  /** Exact content types accepted. No wildcards - the value is signed. */
  contentTypes: readonly string[];

  /** Largest object accepted, in bytes. */
  maxBytes: number;
}

const MB = 1024 * 1024;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

/**
 * Per-purpose limits, applied before anything is signed.
 *
 * Deliberately an exact list rather than an `image/*` style prefix match:
 * the content type ends up inside the signature, so it has to be the
 * literal string the client will send on the PUT.
 */
export const UPLOAD_POLICY: Readonly<Record<UploadPurpose, UploadPolicy>> = {
  [UploadPurpose.Content]: {
    prefix: 'content',
    contentTypes: [
      ...IMAGE_TYPES,
      'application/pdf',
      'video/mp4',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 200 * MB,
  },
  [UploadPurpose.Question]: {
    prefix: 'questions',
    contentTypes: [...IMAGE_TYPES],
    maxBytes: 5 * MB,
  },
  [UploadPurpose.Avatar]: {
    prefix: 'avatars',
    contentTypes: [...IMAGE_TYPES],
    maxBytes: 2 * MB,
  },
};

/**
 * Extension to give the object key, by content type.
 *
 * Taken from the content type rather than from the client's file name: the
 * content type is validated against the policy above and then signed, so it
 * is the one of the two the client cannot quietly disagree with.
 */
export const EXTENSION_BY_CONTENT_TYPE: Readonly<Record<string, string>> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'video/mp4': '.mp4',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    '.docx',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    '.pptx',
};
