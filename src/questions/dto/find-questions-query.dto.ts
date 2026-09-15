import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { QuestionLanguage } from '../question-fields.enum';

/**
 * Filters for GET /questions. Every filter is optional and they combine:
 * passing subjectId and courseId returns the questions matching both.
 *
 * The three taxonomy filters match on the column directly rather than
 * walking the hierarchy - subjectId returns questions tagged to that subject,
 * not every question under its topics. Questions carry all three ids, so a
 * question tagged to a subtopic is still found by its subject.
 */
export class FindQuestionsQueryDto {
  @ApiPropertyOptional({
    description: 'Filter by course',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'courseId must be an integer' })
  @Min(1, { message: 'courseId must be at least 1' })
  courseId?: number;

  @ApiPropertyOptional({
    description: 'Filter by tagged subject',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'subjectId must be an integer' })
  @Min(1, { message: 'subjectId must be at least 1' })
  subjectId?: number;

  @ApiPropertyOptional({
    description: 'Filter by tagged topic',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'topicId must be an integer' })
  @Min(1, { message: 'topicId must be at least 1' })
  topicId?: number;

  @ApiPropertyOptional({
    description: 'Filter by tagged subtopic',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'subtopicId must be an integer' })
  @Min(1, { message: 'subtopicId must be at least 1' })
  subtopicId?: number;

  @ApiPropertyOptional({ enum: QuestionLanguage })
  @IsOptional()
  @IsEnum(QuestionLanguage)
  language?: QuestionLanguage;

  @ApiPropertyOptional({
    description: 'Matches the question text, or a question code such as Q-012.',
    example: 'constitution',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  // Paging is opt-in. Without `page` the endpoint returns the plain array it
  // always has - the Exam Builder loads every question to pick from, and
  // switching this route to pages outright would silently hand it page one.
  @ApiPropertyOptional({
    description:
      'Send to get one page back as { data, total, page, limit, totalPages }. Omit for the full array.',
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({
    description: 'Rows per page when `page` is sent. 1-100, default 10.',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit may not exceed 100' })
  limit?: number;
}
