import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
} from 'class-validator';
import { ContentType } from '../content-type.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContentDto {
  @ApiProperty({ example: 'Indian Polity - Fundamental Rights notes' })
  @IsString()
  @MaxLength(200)
  @Transform(trim)
  title: string;

  @ApiPropertyOptional({ example: 'Covers Articles 12 to 35, with PYQ tags.' })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  description?: string;

  @ApiProperty({ enum: ContentType, example: ContentType.Document })
  @IsEnum(ContentType)
  type: ContentType;

  @ApiPropertyOptional({
    description:
      'The `fileUrl` returned by POST /uploads. Send this or `sourceUrl`, never both.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  @Transform(trim)
  fileUrl?: string;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    description:
      'A link to material hosted elsewhere. Send this or `fileUrl`, never both.',
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(2048)
  @Transform(trim)
  sourceUrl?: string;

  @ApiProperty({
    minimum: 1,
    description: 'Subject the material is filed under.',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId: number;

  @ApiPropertyOptional({
    minimum: 1,
    description: 'Must belong to `subjectId`.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  topicId?: number;

  @ApiPropertyOptional({
    minimum: 1,
    description: 'Must belong to `topicId`, which is then required.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subtopicId?: number;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 4],
    description:
      'Restrict the item to these batches. Omit or send [] to make it visible to every student.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  batchIds?: number[];

  @ApiPropertyOptional({
    default: false,
    description: 'Students see published items only. Defaults to draft.',
  })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isPublished?: boolean;
}
