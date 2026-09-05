import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({
    description: 'ID of the course for which the exam is being created',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiPropertyOptional({
    description:
      'Name this attempt is shown under, e.g. in the Mock Test Scores panel ' +
      'on the student profile. Omit it and responses fall back to the course ' +
      'name.',
    example: 'LDC Weekly Mock Test',
    maxLength: 150,
  })
  @IsOptional()
  @IsString()
  @MaxLength(150, { message: 'Title must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of questions (1-30, defaults to 30)',
    example: 30,
    type: Number,
    minimum: 1,
    maximum: 30,
    default: 30,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30)
  maxQuestions?: number; // Defaults to 30, max 30

  @ApiPropertyOptional({
    description: 'Optional duration limit in minutes',
    example: 60,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  durationMinutes?: number; // Optional duration limit
}


