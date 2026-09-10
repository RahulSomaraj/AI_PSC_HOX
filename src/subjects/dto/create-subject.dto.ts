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

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Name of the subject',
    example: 'Indian Constitution',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'What the subject covers',
    example: 'The Constitution of India, its history, articles and amendments',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Position of the subject in listings (ascending)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
=======
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Subject name - globally unique among live subjects',
    example: 'Indian Constitution',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description: 'Longer description of the subject',
    example: 'Covers the Preamble, Fundamental Rights and Directive Principles.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Display order, ascending',
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
    description: 'Whether the subject is active',
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
