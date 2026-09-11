import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsString, Length, Min } from 'class-validator';
import { UploadPurpose } from '../upload-purpose.enum';

export class CreateUploadUrlDto {
  @ApiProperty({
    enum: UploadPurpose,
    example: UploadPurpose.Content,
    description:
      'What the file is for. Selects the key prefix, the accepted content types and the size limit.',
  })
  @IsEnum(UploadPurpose)
  purpose: UploadPurpose;

  @ApiProperty({
    example: 'kerala-psc-2024-notes.pdf',
    description:
      'Original file name, for the caller to store as a display name. It does not become the object key.',
  })
  @IsString()
  @Length(1, 255)
  fileName: string;

  @ApiProperty({
    example: 'application/pdf',
    description:
      'Exact content type of the file. Signed into the upload URL, so the PUT must send this same value.',
  })
  @IsString()
  @Length(1, 255)
  contentType: string;

  @ApiProperty({
    example: 2_400_000,
    description:
      'Exact size of the file in bytes. Signed into the upload URL, so the PUT must send this same value as Content-Length.',
  })
  @IsInt()
  @Min(1)
  contentLength: number;
}
