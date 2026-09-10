import { ApiProperty } from '@nestjs/swagger';

/**
 * One row of the Mock Test Scores panel on the student profile: what the
 * attempt was called, what it scored and when it was sat.
 *
 * Only completed attempts reach this shape, which is why every field is
 * non-null - a pending attempt has no score and no date, and would render as
 * an empty row. UsersService.findExamsForUser applies that filter.
 *
 * Deliberately narrower than ExamResponseDto: the panel is a list of scores,
 * so it has no use for the question ids, the submitted answers or the course
 * relation, and those are the expensive columns on the table.
 */
export class UserExamDto {
  @ApiProperty({ description: 'Exam attempt ID', example: 12 })
  examId: number;

  @ApiProperty({
    description:
      'Name the attempt is shown under, falling back to the course name ' +
      'when the attempt was never given one.',
    example: 'LDC Weekly Mock Test',
  })
  title: string;

  @ApiProperty({ description: 'Score obtained', example: 75 })
  score: number;

  @ApiProperty({ description: 'Total possible score', example: 100 })
  totalPossibleScore: number;

  @ApiProperty({
    description: 'When the attempt was completed',
    example: '2026-03-12T11:00:00.000Z',
  })
  completedAt: Date;
}
