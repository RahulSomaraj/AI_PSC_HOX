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

export class CreateTopicDto {
  @ApiProperty({
    description: 'ID of the subject this topic belongs to',
    example: 1,
<<<<<<< HEAD
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  subjectId: number;

  @ApiProperty({
    description: 'Name of the topic',
    example: 'Fundamental Rights',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'What the topic covers',
    example: 'Articles 12 to 35 of the Constitution',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Position of the topic within the subject (ascending)',
    example: 3,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
=======
    type: Number,
  })
  @IsNotEmpty({ message: 'subjectId is required' })
  @Type(() => Number)
  @IsInt({ message: 'subjectId must be an integer' })
  @Min(1, { message: 'subjectId must be at least 1' })
  subjectId: number;

  @ApiProperty({
    description: 'Topic name - unique within its subject among live topics',
    example: 'Fundamental Rights',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Longer description of the topic',
    example: 'Articles 12 to 35 of the Constitution.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order within the subject, ascending',
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
    description: 'Whether the topic is active',
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
