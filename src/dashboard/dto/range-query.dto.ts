import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

/** `7d` -> 7. Callers have already validated the shape. */
export const daysIn = (range: string | undefined, fallback = 7): number =>
  range ? Number.parseInt(range, 10) : fallback;

/**
 * The chart window, as the console sends it: `?range=7d`.
 *
 * A string with a unit rather than a bare `days` number because that is the
 * console's contract, and because a unit leaves room for `12w` or `6m` later
 * without renaming the parameter. Only days are accepted today.
 */
export class RangeQueryDto {
  @ApiPropertyOptional({
    description: 'How far back the chart reaches, ending today. 1d to 90d.',
    default: '7d',
    example: '7d',
    pattern: '^([1-9]|[1-8][0-9]|90)d$',
  })
  @IsOptional()
  @Matches(/^(?:[1-9]|[1-8]\d|90)d$/, {
    message: 'range must be a number of days from 1d to 90d, e.g. 7d',
  })
  range?: string;
}
