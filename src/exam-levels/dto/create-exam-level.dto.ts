<<<<<<< HEAD
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
=======
import { Transform, Type } from 'class-transformer';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
<<<<<<< HEAD

export class CreateExamLevelDto {
  @ApiProperty({
    description: 'Name of the exam level',
    example: 'Degree Level',
    maxLength: 120,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: 'What the level covers',
    example:
      'Posts that require a bachelor degree as the minimum qualification',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Position of the level in listings (ascending)',
    example: 3,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the level is active',
    example: true,
    default: true,
  })
  @IsOptional()
<<<<<<< HEAD
  @IsBoolean()
=======
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean value' })
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  isActive?: boolean;
}
