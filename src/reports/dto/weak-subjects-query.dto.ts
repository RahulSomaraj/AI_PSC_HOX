import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

/** Tuning for the Weak Subjects rollup. */
export class WeakSubjectsQueryDto {
  @ApiPropertyOptional({
    description: 'How many subjects to return, weakest first.',
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

  @ApiPropertyOptional({
    description:
      'Noise floor: subjects with fewer answers than this are left out, ' +
      'because one wrong answer out of one is not a weakness. Pass 1 to see ' +
      'every subject the student has touched.',
    minimum: 1,
    maximum: 100,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'minAttempts must be an integer' })
  @Min(1, { message: 'minAttempts must be at least 1' })
  @Max(100, { message: 'minAttempts may not exceed 100' })
  minAttempts?: number;
}
