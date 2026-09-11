import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** How many rows the "recently added questions" list should return. */
export class RecentQuestionsQueryDto {
  @ApiPropertyOptional({
    description: 'How many questions to return, newest first.',
    minimum: 1,
    maximum: 50,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit may not exceed 50' })
  limit?: number;
}
