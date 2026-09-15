import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { BatchMode } from '../../common/enums/batch-mode.enum';
import { BatchStatus } from '../../common/enums/batch-status.enum';

export class CreateBatchDto {
  @ApiProperty({
    description: 'Name of the batch',
    example: 'Alpha Batch 2025',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description:
      'ID of the exam / post this batch is coached for. Named `targetExamId` to match the console; stored as `exam_id`.',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  targetExamId: number;

  @ApiProperty({
    description: 'How the batch is delivered',
    enum: BatchMode,
    example: BatchMode.Online,
  })
  @IsNotEmpty()
  @IsEnum(BatchMode)
  mode: BatchMode;

  @ApiPropertyOptional({
    description: 'Number of students in the batch',
    example: 120,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  studentCount?: number;

  @ApiProperty({
    description: 'Start date in YYYY-MM-DD format',
    example: '2025-01-01',
  })
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString(
    { strict: false },
    { message: 'startDate must be a valid date (YYYY-MM-DD)' },
  )
  startDate: string;

  @ApiProperty({
    description: 'End date in YYYY-MM-DD format. Must not precede startDate.',
    example: '2025-12-01',
  })
  @IsNotEmpty({ message: 'End date is required' })
  @IsDateString(
    { strict: false },
    { message: 'endDate must be a valid date (YYYY-MM-DD)' },
  )
  endDate: string;

  @ApiPropertyOptional({
    description: 'Lifecycle status of the batch',
    enum: BatchStatus,
    example: BatchStatus.Upcoming,
    default: BatchStatus.Upcoming,
  })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus;

  @ApiPropertyOptional({
    description: 'Description of the batch',
    example: 'Weekend online batch for the 2025 LDC cycle',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'When the batch meets, as free text.',
    example: '10:00 AM - 12:00 PM',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timings?: string;

  @ApiPropertyOptional({
    description: 'Header photo - the `fileUrl` returned by POST /uploads.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  imageUrl?: string;

  /**
   * Accepted and ignored. The batch table has no shift - `mode` replaced it -
   * but the console still derives one from `timings` and sends it on every
   * create and update (its `shift.ts`, which its own comment asks to delete).
   * Without this, `forbidNonWhitelisted` would 400 every save from the
   * console. Remove once the console stops sending it.
   */
  @ApiPropertyOptional({
    enum: ['Morning', 'Evening'],
    deprecated: true,
    description:
      'Ignored. Accepted only so the console can keep sending it while it removes its shift guess.',
  })
  @IsOptional()
  @IsIn(['Morning', 'Evening'])
  shift?: 'Morning' | 'Evening';
}
