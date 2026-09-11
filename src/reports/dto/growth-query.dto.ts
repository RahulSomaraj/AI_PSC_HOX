import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Window for the Growth & Engagement tab.
 *
 * Its own DTO rather than the dashboard's DaysQueryDto: a growth chart is
 * read over months, not the dashboard's week, so both the default and the
 * ceiling are larger.
 */
export class GrowthQueryDto {
  @ApiPropertyOptional({
    description:
      'How many days to return, ending today. Active-user figures are only ' +
      'meaningful back to the day presence tracking shipped; earlier days ' +
      'report zero because nothing was recorded, not because nobody came.',
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
}
