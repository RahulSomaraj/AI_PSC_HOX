import { ApiProperty } from '@nestjs/swagger';

/** One day on the growth chart. */
export class GrowthPointDto {
  @ApiProperty({
    description: 'Calendar date in the activity timezone, YYYY-MM-DD.',
    example: '2026-09-11',
  })
  date: string;

  @ApiProperty({ description: 'Students who signed up.', example: 14 })
  signups: number;

  @ApiProperty({
    description: 'Distinct students seen. Zero before presence tracking.',
    example: 148,
  })
  activeUsers: number;

  @ApiProperty({ description: 'Subscriptions that started.', example: 6 })
  newSubscriptions: number;

  @ApiProperty({ description: 'Exam attempts started.', example: 63 })
  examAttempts: number;
}

/** Totals across the window. */
export class GrowthSummaryDto {
  @ApiProperty({ example: 96 })
  signups: number;

  @ApiProperty({ example: 41 })
  newSubscriptions: number;

  @ApiProperty({ example: 402 })
  examAttempts: number;

  @ApiProperty({
    description: 'Distinct students seen at least once in the window.',
    example: 512,
  })
  activeUsers: number;

  @ApiProperty({
    description:
      'Mean of the daily active counts across the window, one decimal.',
    example: 148.3,
  })
  averageDailyActive: number;

  @ApiProperty({
    description:
      'Students who existed before the window and were seen during it, as a ' +
      'percentage of those who existed before it. Null when none did.',
    example: 34.2,
    nullable: true,
  })
  returningRate: number | null;
}

/** The Growth & Engagement tab. */
export class GrowthEngagementDto {
  @ApiProperty({ type: GrowthSummaryDto })
  summary: GrowthSummaryDto;

  @ApiProperty({ type: [GrowthPointDto] })
  series: GrowthPointDto[];
}
