import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SyllabusPriority } from '../../common/enums/syllabus-priority.enum';

export class CreateExamSyllabusItemDto {
  @ApiProperty({
    description: 'ID of the syllabus this item belongs to',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'syllabusId is required' })
  @Type(() => Number)
  @IsInt({ message: 'syllabusId must be an integer' })
  @Min(1, { message: 'syllabusId must be at least 1' })
  syllabusId: number;

  @ApiProperty({
    description:
      'Subject this item maps to. Required - an item always names a ' +
      'subject, and topicId and subtopicId only narrow it.',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'subjectId is required' })
  @Type(() => Number)
  @IsInt({ message: 'subjectId must be an integer' })
  @Min(1, { message: 'subjectId must be at least 1' })
  subjectId: number;

  @ApiPropertyOptional({
    description:
      'Narrow the mapping to one topic. Must belong to subjectId. Omit to ' +
      'map the whole subject.',
    example: 1,
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'topicId must be an integer' })
  @Min(1, { message: 'topicId must be at least 1' })
  topicId?: number | null;

  @ApiPropertyOptional({
    description:
      'Narrow the mapping to one subtopic. Must belong to topicId, and ' +
      'topicId must be set.',
    example: 1,
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'subtopicId must be an integer' })
  @Min(1, { message: 'subtopicId must be at least 1' })
  subtopicId?: number | null;

  @ApiPropertyOptional({
    description:
      'How much preparation weight this item carries. The coaching ' +
      'judgement, as opposed to the exam\'s published weightages below.',
    enum: SyllabusPriority,
    example: SyllabusPriority.Medium,
    default: SyllabusPriority.Medium,
  })
  @IsOptional()
  @IsEnum(SyllabusPriority, {
    message: 'priority must be one of: high, medium, low',
  })
  priority?: SyllabusPriority;

  // numeric(5,2). The @Max guards that precision: a larger value would be
  // rejected by Postgres as a numeric overflow, which surfaces as a 500
  // rather than a validation error.
  @ApiPropertyOptional({
    description:
      'Share of the stage marks this item carries, where the exam publishes ' +
      'one. Two decimal places.',
    example: 12.5,
    minimum: 0,
    maximum: 999.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: 'marksWeightage must be a number with at most 2 decimal places',
    },
  )
  @Min(0, { message: 'marksWeightage must be at least 0' })
  @Max(999.99, { message: 'marksWeightage must be at most 999.99' })
  marksWeightage?: number;

  @ApiPropertyOptional({
    description:
      'Number of questions this item typically accounts for, where the exam ' +
      'publishes one.',
    example: 10,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'questionWeightage must be an integer' })
  @Min(0, { message: 'questionWeightage must be at least 0' })
  questionWeightage?: number;

  @ApiPropertyOptional({
    description: 'Display order within the syllabus, ascending',
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder must be an integer' })
  @Min(0, { message: 'sortOrder must be at least 0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the item is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  // No description field: architecture.md gives exam_syllabus_items none.
  // An item is a pointer, and the prose lives on the subject, topic or
  // subtopic it points at.
  //
  // No audit fields either - the table carries only createdAt.
}
