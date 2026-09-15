import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpcomingExamsQueryDto {
  @ApiPropertyOptional({
    description: 'How many upcoming exams to return, soonest first.',
    minimum: 1,
    maximum: 50,
    default: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit may not exceed 50' })
  limit?: number;
}

/**
 * One row of the dashboard's Upcoming Exams table, in the console's shape.
 * No row can be produced yet - see DashboardService.upcomingExams.
 */
export class UpcomingExamDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'LDC Preliminary' })
  exam: string;

  @ApiProperty({ example: '2025-11-21T00:00:00.000Z', description: 'ISO.' })
  date: string;

  @ApiProperty({
    example: 'LDC (10th Level)',
    description: 'Exam and level, composed by the server.',
  })
  level: string;

  @ApiProperty({
    example: 'Batch A',
    nullable: true,
    type: String,
    description: 'The batch it targets, or null when it targets none.',
  })
  batch: string | null;
}
