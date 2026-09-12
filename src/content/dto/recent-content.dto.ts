import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ContentType } from '../content-type.enum';

/** Tuning for the Recently Viewed Content panel. */
export class RecentContentQueryDto {
  @ApiPropertyOptional({
    description: 'How many opens to return, newest first.',
    minimum: 1,
    maximum: 50,
    default: 5,
    example: 5,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(50, { message: 'limit may not exceed 50' })
  limit?: number;
}

export class RecentContentDto {
  @ApiProperty({
    example: 12,
    description:
      'The content item, not the view. Fetch it with GET /content/:id.',
  })
  id: number;

  @ApiProperty({ example: 'Indian Polity - Fundamental Rights notes' })
  title: string;

  @ApiProperty({
    enum: ContentType,
    example: ContentType.Pdf,
    description:
      'The item type. The same enum as `ContentItem.type`, as P2-6 asks.',
  })
  kind: ContentType;

  @ApiProperty({
    example: '2026-09-12T04:00:00.000Z',
    description: 'When they opened it. ISO, because it is one row’s moment.',
  })
  viewedAt: string;
}
