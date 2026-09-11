import { ApiProperty } from '@nestjs/swagger';

/** One student's row on the Student Performance tab. */
export class StudentPerformanceRowDto {
  @ApiProperty({ example: 42 })
  userId: number;

  @ApiProperty({ example: 'Anjali Menon' })
  studentName: string;

  @ApiProperty({ example: 'anjali@example.com' })
  email: string;

  @ApiProperty({
    description:
      'Batch the student is assigned to, or null. The assignment lives on ' +
      'the aspirant profile, so a student without a profile has none.',
    example: 'LDC Evening 2026',
    nullable: true,
  })
  batchName: string | null;

  @ApiProperty({ example: 3, nullable: true })
  batchId: number | null;

  @ApiProperty({ description: 'Completed attempts.', example: 12 })
  examsTaken: number;

  @ApiProperty({
    description:
      'Mean of score/totalPossibleScore across completed attempts, as a ' +
      'percentage to one decimal. Null when the student has completed none, ' +
      'or none recorded a total to divide by.',
    example: 58.4,
    nullable: true,
  })
  averageScore: number | null;

  @ApiProperty({
    description: 'Questions answered, practice and exam together.',
    example: 430,
  })
  attempted: number;

  @ApiProperty({ example: 268 })
  correct: number;

  @ApiProperty({
    description:
      'correct / attempted as a percentage to one decimal. Null when the ' +
      'student has answered nothing.',
    example: 62.3,
    nullable: true,
  })
  accuracy: number | null;

  @ApiProperty({
    description:
      'Last date the student was seen, YYYY-MM-DD, or null if never. Only ' +
      'covers the period since presence tracking shipped.',
    example: '2026-09-10',
    nullable: true,
  })
  lastActiveOn: string | null;
}

/** A page of the Student Performance tab. */
export class StudentPerformanceDto {
  @ApiProperty({ type: [StudentPerformanceRowDto] })
  items: StudentPerformanceRowDto[];

  @ApiProperty({ example: 1240 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 25 })
  limit: number;

  @ApiProperty({ example: 50 })
  totalPages: number;
}
