import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Window length for the dashboard's time-series endpoints. */
export class DaysQueryDto {
  @ApiPropertyOptional({
    description: 'How many days to return, ending today.',
    minimum: 1,
    maximum: 90,
    default: 7,
    example: 7,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'days must be an integer' })
  @Min(1, { message: 'days must be at least 1' })
  @Max(90, { message: 'days may not exceed 90' })
  days?: number;
}
