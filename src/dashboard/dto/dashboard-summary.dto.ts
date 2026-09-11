import { ApiProperty } from '@nestjs/swagger';

/** The KPI tiles across the top of the admin dashboard. */
export class DashboardSummaryDto {
  @ApiProperty({
    description: 'Non-deleted accounts with role=user.',
    example: 1240,
  })
  totalStudents: number;

  @ApiProperty({
    description:
      "Batches whose status is 'active' or 'ongoing'. The status column " +
      'carries both admin intent and lifecycle, so both values count as ' +
      'running - see API_CONTRACT.md.',
    example: 18,
  })
  activeBatches: number;

  @ApiProperty({
    description:
      'Subscriptions that have not expired and were not cancelled, held by ' +
      'a live user. Same figure as GET /subscriptions/stats/active-count.',
    example: 842,
  })
  activeSubscriptions: number;
}
