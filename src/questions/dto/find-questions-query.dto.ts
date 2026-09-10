import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

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
}
