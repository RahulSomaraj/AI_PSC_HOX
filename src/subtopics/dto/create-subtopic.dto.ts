import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSubtopicDto {
  @ApiProperty({
    description: 'ID of the topic this subtopic belongs to',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  topicId: number;

  @ApiProperty({
    description: 'Name of the subtopic',
    example: 'Article 21',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'What the subtopic covers',
    example: 'Protection of life and personal liberty',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Position of the subtopic within the topic (ascending)',
    example: 5,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the subtopic is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
