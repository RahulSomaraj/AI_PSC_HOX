<<<<<<< HEAD
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
=======
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
<<<<<<< HEAD
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
    description: 'ID of the exam / post this batch is coached for',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examId: number;

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
=======
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatchShift } from '../entities/batch.entity';

export class CreateBatchDto {
  @ApiProperty({
    description: 'Batch name - unique per shift among live batches',
    example: 'Batch A',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(100, { message: 'Name must be at most 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiProperty({
    description: 'Shift the batch runs in',
    enum: BatchShift,
    example: BatchShift.Morning,
  })
  @IsNotEmpty({ message: 'Shift is required' })
  @IsEnum(BatchShift, { message: 'Shift must be one of: Morning, Evening' })
  shift: BatchShift;

  @ApiPropertyOptional({
    description: 'Whether the batch is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
}
