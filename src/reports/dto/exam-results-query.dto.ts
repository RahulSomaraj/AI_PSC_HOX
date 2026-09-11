import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Paging and stage narrowing for the results roster. */
export class ExamResultsQueryDto {
  @ApiPropertyOptional({
    description:
      'Narrow to a single stage of this exam post. Omit to return every ' +
      'stage - but note that scores are only comparable within a stage, so ' +
      'the ranking of a mixed list means little.',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stageId must be an integer' })
  @Min(1, { message: 'stageId must be at least 1' })
  stageId?: number;

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
