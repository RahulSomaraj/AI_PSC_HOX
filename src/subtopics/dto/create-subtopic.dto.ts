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
=======
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1

export class CreateSubtopicDto {
  @ApiProperty({
    description: 'ID of the topic this subtopic belongs to',
    example: 1,
<<<<<<< HEAD
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
=======
    type: Number,
  })
  @IsNotEmpty({ message: 'topicId is required' })
  @Type(() => Number)
  @IsInt({ message: 'topicId must be an integer' })
  @Min(1, { message: 'topicId must be at least 1' })
  topicId: number;

  @ApiProperty({
    description: 'Subtopic name - unique within its topic among live subtopics',
    example: 'Right to Equality',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Longer description of the subtopic',
    example: 'Articles 14 to 18.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order within the topic, ascending',
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
    description: 'Whether the subtopic is active',
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
