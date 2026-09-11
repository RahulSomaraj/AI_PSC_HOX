import { ApiProperty } from '@nestjs/swagger';

/** Headline numbers across every attempt in scope. */
export class ExamAnalyticsSummaryDto {
  @ApiProperty({ description: 'Attempt rows created, any status.', example: 1820 })
  totalAttempts: number;

  @ApiProperty({ example: 1544 })
  completed: number;

  @ApiProperty({
    description: 'Started but never submitted, plus those that timed out.',
    example: 276,
  })
  abandoned: number;

  @ApiProperty({
    description: 'completed / totalAttempts as a percentage, one decimal.',
    example: 84.8,
    nullable: true,
  })
  completionRate: number | null;

  @ApiProperty({
    description:
      'Mean of score/totalPossibleScore across completed attempts, as a ' +
      'percentage. Null when nothing has been completed.',
    example: 57.2,
    nullable: true,
  })
  averageScore: number | null;

  @ApiProperty({ description: 'Distinct students who attempted.', example: 612 })
  distinctStudents: number;
}

/** One exam's row on the Exam Analytics tab. */
export class ExamAnalyticsRowDto {
  @ApiProperty({
    description:
      'The course the attempts were drawn from. Attempts are grouped by ' +
      'course, not by catalogue exam - see the note in API_CONTRACT.md.',
    example: 4,
  })
  courseId: number;

  @ApiProperty({ example: 'Kerala PSC LDC' })
  courseName: string;

  @ApiProperty({ example: 240 })
  attempts: number;

  @ApiProperty({ example: 198 })
  completed: number;

  @ApiProperty({ example: 132 })
  distinctStudents: number;

  @ApiProperty({ example: 57.2, nullable: true })
  averageScore: number | null;

  @ApiProperty({
    description: 'Best single completed attempt, as a percentage.',
    example: 94.0,
    nullable: true,
  })
  highestScore: number | null;

  @ApiProperty({ example: 12.5, nullable: true })
  lowestScore: number | null;

  @ApiProperty({
    description:
      'Answer accuracy across those attempts, from the answer log. Null when ' +
      'no answers were logged.',
    example: 61.4,
    nullable: true,
  })
  accuracy: number | null;

  @ApiProperty({ example: '2026-09-10T11:42:00.000Z', nullable: true })
  lastAttemptAt: Date | null;
}

/** The Exam Analytics tab. */
export class ExamAnalyticsDto {
  @ApiProperty({ type: ExamAnalyticsSummaryDto })
  summary: ExamAnalyticsSummaryDto;

  @ApiProperty({ type: [ExamAnalyticsRowDto] })
  items: ExamAnalyticsRowDto[];

  @ApiProperty({ example: 18 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;

  @ApiProperty({ example: 1 })
  totalPages: number;
}
