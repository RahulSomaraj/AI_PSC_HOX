import { ApiProperty } from '@nestjs/swagger';

/** One row of the Weak Subjects panel on a student profile. */
export class WeakSubjectDto {
  @ApiProperty({ example: 12 })
  subjectId: number;

  @ApiProperty({ example: 'Indian Polity' })
  subjectName: string;

  @ApiProperty({
    description:
      'Questions answered in this subject, practice and exam together.',
    example: 48,
  })
  attempted: number;

  @ApiProperty({ description: 'How many were correct.', example: 19 })
  correct: number;

  @ApiProperty({ description: 'attempted - correct.', example: 29 })
  incorrect: number;

  @ApiProperty({
    description:
      'correct / attempted as a percentage, one decimal place. The list is ' +
      'ordered by this ascending, so the weakest subject comes first.',
    example: 39.6,
  })
  accuracy: number;

  @ApiProperty({
    description:
      'Same as `subjectName` - the name the console’s WeakSubject type reads.',
    example: 'Indian Polity',
  })
  name: string;

  @ApiProperty({
    description:
      'Same as `accuracy`, 0-100 - the name the console’s WeakSubject type reads.',
    example: 39.6,
  })
  percentage: number;
}
