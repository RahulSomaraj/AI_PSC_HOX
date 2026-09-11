import { ApiProperty } from '@nestjs/swagger';

/** One student's attempt at a catalogue stage. */
export class ExamResultRowDto {
  @ApiProperty({
    description:
      'Position within this response, 1-based, by percentage descending. ' +
      'Equal percentages share a rank, and the next rank skips accordingly ' +
      '(1, 2, 2, 4).',
    example: 1,
  })
  rank: number;

  @ApiProperty({ description: 'The attempt row id.', example: 913 })
  attemptId: number;

  @ApiProperty({ example: 42 })
  userId: number;

  @ApiProperty({ example: 'Anjali Menon' })
  studentName: string;

  @ApiProperty({ example: 'anjali@example.com' })
  email: string;

  @ApiProperty({ example: 3 })
  stageId: number;

  @ApiProperty({ example: 'Prelims' })
  stageName: string;

  @ApiProperty({ description: 'Points scored.', example: 184, nullable: true })
  score: number | null;

  @ApiProperty({ example: 300, nullable: true })
  totalPossibleScore: number | null;

  @ApiProperty({
    description:
      'score / totalPossibleScore as a percentage, one decimal place. Null ' +
      'when the attempt recorded no total to divide by.',
    example: 61.3,
    nullable: true,
  })
  percentage: number | null;

  @ApiProperty({
    description: 'Questions answered, counted from the answer log.',
    example: 30,
  })
  attempted: number;

  @ApiProperty({ example: 19 })
  correct: number;

  @ApiProperty({ example: 11 })
  incorrect: number;

  @ApiProperty({ example: '2026-09-10T11:42:00.000Z' })
  completedAt: Date;
}

/** A page of the results roster. */
export class ExamResultsDto {
  @ApiProperty({ type: [ExamResultRowDto] })
  items: ExamResultRowDto[];

  @ApiProperty({
    description: 'Matching attempts across every page.',
    example: 128,
  })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;

  @ApiProperty({ example: 6 })
  totalPages: number;
}
