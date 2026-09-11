import { ConfigService } from '@nestjs/config';
import {
  PayloadTooLargeException,
  ServiceUnavailableException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { UploadsService } from './uploads.service';
import { UploadPurpose } from './upload-purpose.enum';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';

/** A ConfigService standing in for a given set of environment variables. */
const configOf = (env: Record<string, string>) =>
  ({ get: (key: string) => env[key] }) as unknown as ConfigService;

const CONFIGURED = {
  S3_BUCKET: 'psc-uploads',
  S3_REGION: 'ap-south-1',
  S3_ACCESS_KEY_ID: 'test-key',
  S3_SECRET_ACCESS_KEY: 'test-secret',
  UPLOAD_URL_EXPIRY_SECONDS: '300',
};

const pdf = (over: Partial<CreateUploadUrlDto> = {}): CreateUploadUrlDto => ({
  purpose: UploadPurpose.Content,
  fileName: 'notes.pdf',
  contentType: 'application/pdf',
  contentLength: 2_400_000,
  ...over,
});

describe('UploadsService', () => {
  describe('when storage is not configured', () => {
    it('answers 503 rather than failing at startup', async () => {
      const service = new UploadsService(configOf({}));

      await expect(service.createUploadUrl(pdf())).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });
  });

  describe('createUploadUrl', () => {
    let service: UploadsService;

    beforeEach(() => {
      service = new UploadsService(configOf(CONFIGURED));
    });

    it('signs the content type and length, so neither is client-side only', async () => {
      const { uploadUrl } = await service.createUploadUrl(pdf());

      const signed = new URL(uploadUrl).searchParams.get('X-Amz-SignedHeaders');
      expect(signed).toContain('content-type');
      expect(signed).toContain('content-length');
    });

    it('returns the headers the PUT has to echo', async () => {
      const { requiredHeaders } = await service.createUploadUrl(pdf());

      expect(requiredHeaders).toEqual({
        'Content-Type': 'application/pdf',
        'Content-Length': '2400000',
      });
    });

    it('keys by purpose and uuid, never by the name that came over the wire', async () => {
      const { key, fileUrl } = await service.createUploadUrl(
        pdf({ fileName: '../../etc/passwd' }),
      );

      expect(key).toMatch(
        /^content\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.pdf$/,
      );
      expect(fileUrl).toBe(
        `https://psc-uploads.s3.ap-south-1.amazonaws.com/${key}`,
      );
    });

    it('gives two uploads of the same file different keys', async () => {
      const first = await service.createUploadUrl(pdf());
      const second = await service.createUploadUrl(pdf());

      expect(first.key).not.toBe(second.key);
    });

    it('rejects a content type the purpose does not accept', async () => {
      await expect(
        service.createUploadUrl(
          pdf({ purpose: UploadPurpose.Avatar, contentType: 'application/pdf' }),
        ),
      ).rejects.toBeInstanceOf(UnsupportedMediaTypeException);
    });

    it('rejects a file over the limit for its purpose', async () => {
      await expect(
        service.createUploadUrl(
          pdf({
            purpose: UploadPurpose.Avatar,
            contentType: 'image/png',
            contentLength: 5 * 1024 * 1024,
          }),
        ),
      ).rejects.toBeInstanceOf(PayloadTooLargeException);
    });

    it('expires the URL at the configured horizon', async () => {
      const before = Date.now();
      const { expiresAt } = await service.createUploadUrl(pdf());
      const after = Date.now();

      // Bounded by the clock either side of the call rather than by an exact
      // value: signing is async, so any time it spends counts towards this.
      const expiry = new Date(expiresAt).getTime();
      expect(expiry).toBeGreaterThanOrEqual(before + 300_000);
      expect(expiry).toBeLessThanOrEqual(after + 300_000);
    });

    it('honours a CDN base url for fileUrl without touching the upload host', async () => {
      const cdn = new UploadsService(
        configOf({ ...CONFIGURED, S3_PUBLIC_URL: 'https://cdn.psc.app/' }),
      );

      const { fileUrl, uploadUrl } = await cdn.createUploadUrl(pdf());

      expect(fileUrl).toMatch(/^https:\/\/cdn\.psc\.app\/content\//);
      expect(uploadUrl).toContain('psc-uploads.s3.ap-south-1.amazonaws.com');
    });

    it('points at a custom endpoint, path style, when one is set', async () => {
      const minio = new UploadsService(
        configOf({ ...CONFIGURED, S3_ENDPOINT: 'http://localhost:9000' }),
      );

      const { uploadUrl, fileUrl } = await minio.createUploadUrl(pdf());

      expect(uploadUrl).toContain('http://localhost:9000/psc-uploads/');
      expect(fileUrl).toContain('http://localhost:9000/psc-uploads/');
    });
  });
});
