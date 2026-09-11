import { ApiProperty } from '@nestjs/swagger';

/** One point on the Daily Active Users chart. */
export class DailyActiveCountDto {
  @ApiProperty({
    description:
      'Calendar date in the configured activity timezone, YYYY-MM-DD.',
    example: '2026-09-11',
  })
  date: string;

  @ApiProperty({
    description:
      'Distinct users active on that date. Zero for days nobody was active - ' +
      'the series is gap-filled so the chart has a point per day.',
    example: 148,
  })
  count: number;
}
