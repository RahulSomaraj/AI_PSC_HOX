import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamSyllabusDto {
  @ApiProperty({
    description:
      'ID of the exam post this syllabus belongs to. Must be the post that ' +
      'owns examStageId - the two are checked against each other.',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'examPostId is required' })
  @Type(() => Number)
  @IsInt({ message: 'examPostId must be an integer' })
  @Min(1, { message: 'examPostId must be at least 1' })
  examPostId: number;

  @ApiProperty({
    description:
      'ID of the exam stage this syllabus covers. A stage may have only one ' +
      'live syllabus.',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'examStageId is required' })
  @Type(() => Number)
  @IsInt({ message: 'examStageId must be an integer' })
  @Min(1, { message: 'examStageId must be at least 1' })
  examStageId: number;

  @ApiProperty({
    description: 'Title of the syllabus',
    example: 'LDC Preliminary - Detailed Syllabus 2026',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  @MaxLength(200, { message: 'Title must be at most 200 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @ApiPropertyOptional({
    description: 'Longer description of the syllabus',
    example: 'Covers the full prelims syllabus as published in the 2026 notification.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the syllabus is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;
}
