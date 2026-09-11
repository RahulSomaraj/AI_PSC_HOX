import { ApiProperty } from '@nestjs/swagger';

/** One point on the dashboard's exam-attempts chart. */
export class DailyAttemptCountDto {
  @ApiProperty({
    description:
      'Calendar date in the activity timezone, YYYY-MM-DD. Bucketed by the ' +
      'same zone as /dashboard/dau so the two charts line up.',
    example: '2026-09-11',
  })
  date: string;

  @ApiProperty({
    description:
      'Attempt rows created on that date, whatever their status - a pending ' +
      'attempt counts. Zero for quiet days: the series is gap-filled.',
    example: 63,
  })
  count: number;
}
