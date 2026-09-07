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

export class CreateExamPostDto {
  @ApiProperty({
    description: 'ID of the exam level this post is advertised under',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'examLevelId is required' })
  @Type(() => Number)
  @IsInt({ message: 'examLevelId must be an integer' })
  @Min(1, { message: 'examLevelId must be at least 1' })
  examLevelId: number;

  @ApiProperty({
    description: 'Post name - unique within its level among live posts',
    example: 'Lower Division Clerk',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description:
      'Abbreviation the post is commonly known by. Not unique - two levels ' +
      'may advertise posts sharing an abbreviation.',
    example: 'LDC',
    maxLength: 50,
  })
  @IsOptional()
  @IsString({ message: 'shortName must be a string' })
  @MaxLength(50, { message: 'shortName must be at most 50 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  shortName?: string;

  @ApiPropertyOptional({
    description: 'Longer description of the post',
    example: 'Clerical cadre post in various government departments.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  description?: string;

  @ApiPropertyOptional({
    description: 'Government department the post sits in',
    example: 'Revenue',
    maxLength: 150,
  })
  @IsOptional()
  @IsString({ message: 'Department must be a string' })
  @MaxLength(150, { message: 'Department must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  department?: string;

  @ApiPropertyOptional({
    description:
      'Eligibility wording as published. Free text, not the exam level - a ' +
      'published qualification rarely reduces to one band.',
    example: 'A degree from a recognised university, or equivalent.',
  })
  @IsOptional()
  @IsString({ message: 'Qualification must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  qualification?: string;

  @ApiPropertyOptional({
    description: 'Display order within the level, ascending',
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
    description: 'Whether the post is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;
}
