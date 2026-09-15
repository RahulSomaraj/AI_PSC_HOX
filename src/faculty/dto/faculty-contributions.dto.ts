import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class FacultyContributionsQueryDto {
  @ApiPropertyOptional({
    description: 'How many recent items to return.',
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

class ContributionStatsDto {
  @ApiProperty({
    example: 1250,
    description: 'Questions this person authored.',
  })
  questionsCreated: number;

  @ApiProperty({
    example: 82,
    description: 'Live content library items this person authored.',
  })
  contentUploads: number;

  @ApiProperty({
    example: 7.2,
    description:
      'Average question difficulty, out of 10. Stored difficulty is 1-5 and is doubled, because the design prints this out of 10 (console Q78).',
  })
  avgDifficulty: number;

  @ApiProperty({
    example: 94,
    description:
      'Whole percent of authored questions and content that are published.',
  })
  approvalRate: number;
}

class ContributionItemDto {
  @ApiProperty({
    example: 12,
    description:
      'Id of the question or content item. Unique only together with `type` - a question and a content item can share an id.',
  })
  id: number;

  @ApiProperty({
    example: 'Fundamental Rights',
    description: 'Content title, or the question text reduced to plain words.',
  })
  title: string;

  @ApiProperty({ enum: ['question', 'content'], example: 'content' })
  type: 'question' | 'content';

  @ApiProperty({ example: '2025-10-09T00:00:00.000Z', description: 'ISO.' })
  date: string;

  @ApiProperty({
    enum: ['approved', 'pending'],
    example: 'approved',
    description:
      'Published is approved; anything not yet published is pending.',
  })
  status: 'approved' | 'pending';
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

  @ApiProperty({ type: ContributionStatsDto })
  stats: ContributionStatsDto;

  @ApiProperty({
    type: [ContributionItemDto],
    description: 'Newest first, across questions and content together.',
  })
  recent: ContributionItemDto[];
}
