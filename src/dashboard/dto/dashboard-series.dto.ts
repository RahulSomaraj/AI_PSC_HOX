import { ApiProperty } from '@nestjs/swagger';

/** One bar or point on a dashboard chart. */
export class SeriesPointDto {
  @ApiProperty({
    description:
      'Short weekday of the day, in the activity timezone - what the chart draws on its x-axis.',
    example: 'Mon',
  })
  label: string;

  @ApiProperty({ description: 'The count for that day.', example: 148 })
  value: number;

  @ApiProperty({
    description:
      'The calendar day, YYYY-MM-DD. Beyond the console type: weekday labels repeat past seven days, and this does not.',
    example: '2026-09-14',
  })
  date: string;
}

/**
 * A dashboard chart in the console's DashboardSeries shape: the figure printed
 * above the chart, and the points under it.
 */
export class DashboardSeriesDto {
  @ApiProperty({
    description:
      'The headline figure above the chart. What it counts depends on the chart - see each endpoint.',
    example: 1240,
  })
  total: number;

  @ApiProperty({
    type: [SeriesPointDto],
    description: 'Oldest first, one per day, gap-filled with zeroes.',
  })
  points: SeriesPointDto[];
}
