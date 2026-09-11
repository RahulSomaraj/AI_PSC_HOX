import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Filtering and paging for the Exam Analytics tab. */
export class ExamAnalyticsQueryDto {
  @ApiPropertyOptional({
    description: 'Narrow to one course.',
    example: 4,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'courseId must be an integer' })
  @Min(1, { message: 'courseId must be at least 1' })
  courseId?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25, example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit may not exceed 100' })
  limit?: number;
}
