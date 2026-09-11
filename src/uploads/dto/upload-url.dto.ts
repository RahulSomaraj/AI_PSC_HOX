import { ApiProperty } from '@nestjs/swagger';

export class UploadUrlDto {
  @ApiProperty({
    description: 'Presigned URL to PUT the file bytes to. Single use.',
    example:
      'https://psc-uploads.s3.ap-south-1.amazonaws.com/content/2026/09/3f1a....pdf?X-Amz-Algorithm=...',
  })
  uploadUrl: string;

  @ApiProperty({
    description:
      'Where the file will be readable once the PUT succeeds. Send this back on the subsequent create call.',
    example:
      'https://psc-uploads.s3.ap-south-1.amazonaws.com/content/2026/09/3f1a....pdf',
  })
  fileUrl: string;

  @ApiProperty({
    description: 'Object key in the bucket.',
    example: 'content/2026/09/3f1ab2c4-....pdf',
  })
  key: string;

  @ApiProperty({
    description: 'When uploadUrl stops working. ISO 8601.',
    example: '2026-09-11T10:35:00.000Z',
  })
  expiresAt: string;

  @ApiProperty({
    description:
      'Headers the PUT must send, exactly. They are part of the signature: any other value is rejected by storage with 403, and nothing reaches the bucket.',
    example: {
      'Content-Type': 'application/pdf',
      'Content-Length': '2400000',
    },
  })
  requiredHeaders: Record<string, string>;
}
