import { ApiProperty } from '@nestjs/swagger';

/**
 * One row of the dashboard's "recently added questions" list, in the shape
 * the console's RecentQuestion type reads.
 */
export class RecentQuestionDto {
  @ApiProperty({ example: 4821 })
  id: number;

  @ApiProperty({
    description:
      'Full question text, untruncated - the client decides how much of it to show.',
    example:
      'Which article of the Constitution deals with the right to equality?',
  })
  title: string;

  @ApiProperty({
    description:
      'Name of the subject the question is tagged with; null when untagged.',
    example: 'Indian Polity',
    nullable: true,
    type: String,
  })
  subject: string | null;

  @ApiProperty({
    description: 'When the question was added. ISO timestamp.',
    example: '2026-09-11T06:12:44.000Z',
  })
  addedOn: string;

  @ApiProperty({
    description: 'Difficulty, 1 (easiest) to 5. Beyond the console type.',
    example: 3,
  })
  difficulty: number;
}
