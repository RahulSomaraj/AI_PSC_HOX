import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Window, filters and paging for the Content Usage tab. */
export class ContentUsageQueryDto {
  @ApiPropertyOptional({
    description:
      'How many days to return, ending today. Rows only exist from ' +
      '2026-09-12, when view tracking shipped; earlier days report zero ' +
      'because nothing was recorded, not because nothing was read.',
    minimum: 1,
    maximum: 365,
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days must be an integer' })
  @Min(1, { message: 'days must be at least 1' })
  @Max(365, { message: 'days may not exceed 365' })
  days?: number;

  @ApiPropertyOptional({
    description: 'Only views of items filed under this subject.',
    example: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'subjectId must be an integer' })
  @Min(1, { message: 'subjectId must be at least 1' })
  subjectId?: number;

  @ApiPropertyOptional({
    description: 'Only views by readers who were in this batch at the time.',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'batchId must be an integer' })
  @Min(1, { message: 'batchId must be at least 1' })
  batchId?: number;

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
