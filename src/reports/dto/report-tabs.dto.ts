import { ApiProperty } from '@nestjs/swagger';

/*
 * The four Reports tabs in the shapes the console reads - BACKEND_ISSUES.md
 * P2-4, mirrored by `src/features/reports/types.ts` in the console. One
 * response per tab, pre-aggregated and view-shaped: subjects and batches come
 * back as names, not ids.
 */

export class ReportPointDto {
  @ApiProperty({ example: 'Mon', description: 'Short weekday of the day.' })
  label: string;

  @ApiProperty({ example: 14 })
  value: number;
}

export class SubjectScoreDto {
  @ApiProperty({ example: 'Indian Polity' })
  subject: string;

  @ApiProperty({ example: 62.4, description: '0-100, one decimal.' })
  percentage: number;
}

export class BatchCompletionDto {
  @ApiProperty({ example: 'LDC Evening 2026' })
  batch: string;

  @ApiProperty({
    example: 38.5,
    description:
      'How far through its schedule the batch is: days elapsed between start and end dates, 0-100.',
  })
  percentage: number;
}

class StudentPerformanceSummaryDto {
  @ApiProperty({
    example: 412,
    description: 'Distinct students seen in the last 30 days.',
  })
  activeStudents: number;

  @ApiProperty({
    example: 72.8,
    description:
      'Mean score over every completed attempt, 0-100, two decimals.',
  })
  averageExamScore: number;

  @ApiProperty({ example: 1840, description: 'Every attempt ever started.' })
  examsAttempted: number;

  @ApiProperty({
    example: 38,
    description: 'Students who signed up in the last 7 days.',
  })
  newSignups: number;
}

export class StudentPerformanceTabDto {
  @ApiProperty({ type: StudentPerformanceSummaryDto })
  summary: StudentPerformanceSummaryDto;

  @ApiProperty({
    type: [SubjectScoreDto],
    description:
      'Accuracy per subject, whole and name-ordered - the card picks the weakest five itself.',
  })
  weakSubjects: SubjectScoreDto[];

  @ApiProperty({
    type: [SubjectScoreDto],
    description: 'Accuracy per subject. The same figures as weakSubjects.',
  })
  averageAccuracy: SubjectScoreDto[];

  @ApiProperty({ type: [BatchCompletionDto] })
  batchCompletion: BatchCompletionDto[];

  @ApiProperty({
    type: [ReportPointDto],
    description: 'Sign-ups per day for the last 7 days, oldest first.',
  })
  weeklySignups: ReportPointDto[];
}

export class ExamAnalyticsTabRowDto {
  @ApiProperty({
    example: 3,
    description: 'The catalogue exam - the id GET /exams/:id/results takes.',
  })
  examId: number;

  @ApiProperty({ example: 'Lower Division Clerk' })
  examName: string;

  @ApiProperty({ example: 61.2, description: '0-100, one decimal.' })
  averageScore: number;

  @ApiProperty({ example: 94 })
  highestScore: number;

  @ApiProperty({ example: 18.5 })
  lowestScore: number;

  @ApiProperty({
    example: 64.3,
    description:
      'Students who completed it, over students it was meant for - see API_CONTRACT.md.',
  })
  participationRate: number;
}

class ExamAnalyticsSummaryTabDto {
  @ApiProperty({
    example: 920,
    description: 'Practice attempts - attempts not tied to a catalogue exam.',
  })
  mockTests: number;

  @ApiProperty({ example: 24, description: 'Exams in the live catalogue.' })
  totalExams: number;

  @ApiProperty({
    example: 58.1,
    description: 'Mean participationRate across the rows.',
  })
  averageParticipation: number;

  @ApiProperty({
    example: 61.7,
    description: 'Mean score over completed catalogue attempts.',
  })
  averageScore: number;
}

export class ExamAnalyticsTabDto {
  @ApiProperty({ type: ExamAnalyticsSummaryTabDto })
  summary: ExamAnalyticsSummaryTabDto;

  @ApiProperty({ type: [ExamAnalyticsTabRowDto] })
  rows: ExamAnalyticsTabRowDto[];
}

export class ContentUsageTabRowDto {
  @ApiProperty({ example: 12 })
  contentId: number;

  @ApiProperty({ example: 'Fundamental Rights notes' })
  title: string;

  @ApiProperty({ example: 'pdf' })
  type: string;

  @ApiProperty({
    example: 'Indian Polity',
    nullable: true,
    type: String,
    description: 'Null for an item filed under no subject.',
  })
  subject: string | null;

  @ApiProperty({ example: 125 })
  views: number;

  @ApiProperty({
    example: 0,
    description:
      'Always 0: nothing records how much of an item a student finished.',
  })
  completionRate: number;
}

class ContentUsageSummaryTabDto {
  @ApiProperty({ example: 148 })
  contentItems: number;

  @ApiProperty({
    example: 'Fundamental Rights notes',
    nullable: true,
    type: String,
    description: 'Title of the most-opened item, or null before any opens.',
  })
  mostViewedTitle: string | null;

  @ApiProperty({ example: 4820 })
  totalViews: number;

  @ApiProperty({
    example: 0,
    description: 'Always 0 - see completionRate.',
  })
  averageCompletion: number;
}

export class ContentUsageTabDto {
  @ApiProperty({ type: ContentUsageSummaryTabDto })
  summary: ContentUsageSummaryTabDto;

  @ApiProperty({ type: [ContentUsageTabRowDto] })
  rows: ContentUsageTabRowDto[];
}

export class EngagedStudentDto {
  @ApiProperty({ example: 42, description: 'The id GET /users/:id takes.' })
  studentId: number;

  @ApiProperty({ example: 'Anjali Menon' })
  name: string;

  @ApiProperty({
    example: 'LDC Evening 2026',
    nullable: true,
    type: String,
    description: 'Null for a student in no batch.',
  })
  batch: string | null;

  @ApiProperty({ example: '2026-09-15T08:12:00.000Z', description: 'ISO.' })
  lastActiveAt: string;
}

export class EngagementTabDto {
  @ApiProperty({
    type: [EngagedStudentDto],
    description:
      'The 50 most engaged students, most engaged first - the order is the ranking.',
  })
  rows: EngagedStudentDto[];
}
