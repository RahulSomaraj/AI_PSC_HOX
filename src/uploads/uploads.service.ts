import { randomUUID } from 'crypto';
import {
  Injectable,
  Logger,
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { UploadUrlDto } from './dto/upload-url.dto';
import {
  EXTENSION_BY_CONTENT_TYPE,
  UPLOAD_POLICY,
} from './upload-policy';

/**
 * Hands out short-lived presigned PUT URLs so file bytes never pass through
 * this process. The client PUTs straight to storage, then sends the returned
 * `fileUrl` on whatever create call the file belongs to.
 *
 * Written against the S3 API but not against AWS specifically: setting
 * `S3_ENDPOINT` points the same code at Cloudflare R2, MinIO or Spaces.
 */
@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly publicBaseUrl: string;
  private readonly expirySeconds: number;

  constructor(configService: ConfigService) {
    this.bucket = configService.get<string>('S3_BUCKET') ?? '';
    const region = configService.get<string>('S3_REGION') ?? 'ap-south-1';
    const endpoint = configService.get<string>('S3_ENDPOINT')?.replace(/\/$/, '');
    const accessKeyId = configService.get<string>('S3_ACCESS_KEY_ID');
    const secretAccessKey = configService.get<string>('S3_SECRET_ACCESS_KEY');

    const seconds = Number(
      configService.get<string>('UPLOAD_URL_EXPIRY_SECONDS') ?? 300,
    );
    this.expirySeconds =
      Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 300;

    this.publicBaseUrl = (
      configService.get<string>('S3_PUBLIC_URL') ??
      (endpoint
        ? `${endpoint}/${this.bucket}`
        : `https://${this.bucket}.s3.${region}.amazonaws.com`)
    ).replace(/\/$/, '');

    if (!this.bucket) {
      // Deliberately not a startup throw. Two developers share this branch,
      // and neither should be unable to boot the API because the other's
      // module wants a bucket they have no credentials for. The endpoint
      // itself answers 503 instead - see createUploadUrl().
      this.logger.warn(
        'S3_BUCKET is not set - POST /uploads will answer 503 until it is.',
      );
      this.client = null;
      return;
    }

    this.client = new S3Client({
      region,
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      // Explicit keys when given, otherwise the SDK's default chain, which
      // picks up the instance role on a deployed box. Never require keys in
      // the environment just because they are supported.
      ...(accessKeyId && secretAccessKey
        ? { credentials: { accessKeyId, secretAccessKey } }
        : {}),
    });
  }

  /**
   * Signs a single PUT for one file.
   *
   * The content type and the exact byte length go *into the signature*, not
   * merely into a validation check here: `signableHeaders` forces both into
   * `X-Amz-SignedHeaders`, so storage itself recomputes the signature over
   * them and rejects the PUT with 403 if either differs by a byte. A client
   * that asks for a 2 MB PDF cannot then push a 2 GB video, and cannot push
   * anything that would be served back as HTML.
   */
  async createUploadUrl(dto: CreateUploadUrlDto): Promise<UploadUrlDto> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'File uploads are not configured on this server',
      );
    }

    const policy = UPLOAD_POLICY[dto.purpose];

    if (!policy.contentTypes.includes(dto.contentType)) {
      throw new UnsupportedMediaTypeException(
        `${dto.contentType} is not accepted for ${dto.purpose} uploads. Accepted: ${policy.contentTypes.join(', ')}`,
      );
    }

    if (dto.contentLength > policy.maxBytes) {
      throw new PayloadTooLargeException(
        `A ${dto.purpose} upload may be at most ${Math.floor(policy.maxBytes / (1024 * 1024))} MB`,
      );
    }

    const key = this.buildKey(policy.prefix, dto.contentType);

    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: dto.contentType,
        ContentLength: dto.contentLength,
      }),
      {
        expiresIn: this.expirySeconds,
        // Without this the presigner hoists these two out of the signature
        // and the limits above become client-side suggestions.
        signableHeaders: new Set(['content-type', 'content-length']),
      },
    );

    return {
      uploadUrl,
      fileUrl: `${this.publicBaseUrl}/${key}`,
      key,
      expiresAt: new Date(
        Date.now() + this.expirySeconds * 1000,
      ).toISOString(),
      requiredHeaders: {
        'Content-Type': dto.contentType,
        'Content-Length': String(dto.contentLength),
      },
    };
  }

  /**
   * `content/2026/09/3f1ab2c4-....pdf`
   *
   * A UUID rather than the uploaded file name: two students uploading
   * `notes.pdf` must not collide, and a name that arrived over the wire has
   * no business in a key. The date segments keep the bucket browsable and
   * give lifecycle rules something to match on.
   */
  private buildKey(prefix: string, contentType: string): string {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = String(now.getUTCMonth() + 1).padStart(2, '0');
    const extension = EXTENSION_BY_CONTENT_TYPE[contentType] ?? '';

    return `${prefix}/${year}/${month}/${randomUUID()}${extension}`;
  }
}
