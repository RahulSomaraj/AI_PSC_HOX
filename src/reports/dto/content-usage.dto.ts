import { ApiProperty } from '@nestjs/swagger';

/** Headline numbers across the window. */
export class ContentUsageSummaryDto {
  @ApiProperty({ description: 'Content opens in the window.', example: 4820 })
  totalViews: number;

  @ApiProperty({
    description: 'Distinct students who opened anything.',
    example: 412,
  })
  distinctViewers: number;

  @ApiProperty({
    description: 'Distinct items opened at least once.',
    example: 148,
  })
  itemsViewed: number;

  @ApiProperty({
    description:
      'Mean opens per day across every day in the window, including silent ' +
      'ones. One decimal.',
    example: 160.7,
  })
  averageDailyViews: number;
}

/** One day on the usage chart. */
export class ContentUsagePointDto {
  @ApiProperty({
    description: 'Calendar date in the activity timezone, YYYY-MM-DD.',
    example: '2026-09-13',
  })
  date: string;

  @ApiProperty({ example: 163 })
  views: number;
}

/** Views rolled up by the subject the item was filed under. */
export class ContentUsageBySubjectDto {
  @ApiProperty({
    description:
      'Null for items that carried no subject when they were read - the ' +
      'untagged bucket.',
    example: 12,
    nullable: true,
  })
  subjectId: number | null;

  @ApiProperty({
    description:
      'Null when the subject is untagged, and also when the subject row no ' +
      'longer exists - `subject_id` is denormalised and carries no foreign ' +
      'key. Use `subjectId` to tell the two apart.',
    example: 'Indian Polity',
    nullable: true,
  })
  subjectName: string | null;

  @ApiProperty({ example: 1840 })
  views: number;

  @ApiProperty({ example: 268 })
  distinctViewers: number;
}

/** Views rolled up by the batch the *reader* was in. */
export class ContentUsageByBatchDto {
  @ApiProperty({
    description: 'Null for readers who were in no batch when they read.',
    example: 3,
    nullable: true,
  })
  batchId: number | null;

  @ApiProperty({ example: 'LDC Evening 2026', nullable: true })
  batchName: string | null;

  @ApiProperty({ example: 962 })
  views: number;

  @ApiProperty({ example: 74 })
  distinctViewers: number;
}

/** One item's row in the most-opened table. */
export class ContentUsageItemDto {
  @ApiProperty({ example: 91 })
  contentId: number;

  @ApiProperty({ example: 'Indian Polity - Fundamental Rights notes' })
  title: string;

  @ApiProperty({ example: 'pdf' })
  type: string;

  @ApiProperty({ example: 12, nullable: true })
  subjectId: number | null;

  @ApiProperty({ example: 'Indian Polity', nullable: true })
  subjectName: string | null;

  @ApiProperty({ example: 340 })
  views: number;

  @ApiProperty({ example: 212 })
  distinctViewers: number;

  @ApiProperty({ example: '2026-09-13T09:11:00.000Z' })
  lastViewedAt: Date;
}

/** The Content Usage tab. */
export class ContentUsageDto {
  @ApiProperty({ type: ContentUsageSummaryDto })
  summary: ContentUsageSummaryDto;

  @ApiProperty({ type: [ContentUsagePointDto] })
  series: ContentUsagePointDto[];

  @ApiProperty({
    description: 'Top 20 subjects by views, descending.',
    type: [ContentUsageBySubjectDto],
  })
  bySubject: ContentUsageBySubjectDto[];

  @ApiProperty({
    description: 'Top 20 batches by views, descending.',
    type: [ContentUsageByBatchDto],
  })
  byBatch: ContentUsageByBatchDto[];

  @ApiProperty({
    description: 'Most-opened items, paginated.',
    type: [ContentUsageItemDto],
  })
  items: ContentUsageItemDto[];

  @ApiProperty({ description: 'Items opened in the window.', example: 148 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}
