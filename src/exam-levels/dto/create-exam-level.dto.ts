import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamLevelDto {
  @ApiProperty({
    description:
      'Level name - unique among live levels. The band a post is advertised ' +
      'under.',
    example: 'Degree Level',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Longer description of the level',
    example: 'Posts requiring a degree from a recognised university.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order among levels, ascending',
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'sortOrder must be an integer' })
  @Min(0, { message: 'sortOrder must be at least 0' })
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the level is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;
}
