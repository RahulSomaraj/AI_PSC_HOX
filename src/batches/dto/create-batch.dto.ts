import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
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
}
