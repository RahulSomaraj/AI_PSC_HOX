import { ApiProperty } from '@nestjs/swagger';

class QuestionContributionsDto {
  @ApiProperty({ example: 143, description: 'Questions this person authored.' })
  total: number;

  @ApiProperty({
    example: 140,
    description: 'Of those, the ones still in rotation.',
  })
  active: number;
}

class ContentContributionsDto {
  @ApiProperty({
    example: 12,
    description: 'Live library items this person authored.',
  })
  total: number;

  @ApiProperty({ example: 9, description: 'Of those, the ones published.' })
  published: number;
}

export class FacultyContributionsDto {
  @ApiProperty({ example: 10 })
  facultyId: number;

  @ApiProperty({
    example: 20,
    description:
      'The staff account that authored the work. Audit columns carry this, not the faculty id.',
  })
  userId: number;

  @ApiProperty({ type: QuestionContributionsDto })
  questions: QuestionContributionsDto;

  @ApiProperty({ type: ContentContributionsDto })
  content: ContentContributionsDto;

  @ApiProperty({
    nullable: true,
    example: '2026-09-11T06:12:44.000Z',
    description:
      'The most recent authorship across both, or null for someone who has authored nothing.',
  })
  lastContributedAt: string | null;
}
