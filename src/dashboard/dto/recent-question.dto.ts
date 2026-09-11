import { ApiProperty } from '@nestjs/swagger';

/** The subject a question is tagged with, or null if it is untagged. */
export class RecentQuestionSubjectDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Indian Polity' })
  name: string;
}

/** One row of the dashboard's "recently added questions" list. */
export class RecentQuestionDto {
  @ApiProperty({ example: 4821 })
  id: number;

  @ApiProperty({
    description: 'Full question text, untruncated - the client decides how ' +
      'much of it to show.',
    example: 'Which article of the Constitution deals with the right to equality?',
  })
  question: string;

  @ApiProperty({ description: 'Difficulty, 1 (easiest) to 5.', example: 3 })
  difficulty: number;

  @ApiProperty({
    description: 'Subject the question is tagged with; null when untagged.',
    type: RecentQuestionSubjectDto,
    nullable: true,
  })
  subject: RecentQuestionSubjectDto | null;

  @ApiProperty({ example: '2026-09-11T06:12:44.000Z' })
  createdAt: Date;
}
