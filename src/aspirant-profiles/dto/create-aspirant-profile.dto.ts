import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAspirantProfileDto {
  @ApiProperty({
    description: 'ID of the user this profile belongs to',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'userId is required' })
  @Type(() => Number)
  @IsInt({ message: 'userId must be a number' })
  userId: number;

  @ApiProperty({
    description: 'Date of birth in YYYY-MM-DD format',
    example: '1998-05-21',
  })
  @IsNotEmpty({ message: 'Date of birth is required' })
  @IsDateString(
    { strict: false },
    { message: 'dateOfBirth must be a valid date (YYYY-MM-DD)' },
  )
  dateOfBirth: string;

  @ApiProperty({
    description: 'Gender of the aspirant',
    example: 'male',
    enum: ['male', 'female', 'transgender', 'other'],
  })
  @IsNotEmpty({ message: 'Gender is required' })
  @IsIn(['male', 'female', 'transgender', 'other'], {
    message: 'Gender must be one of: male, female, transgender, other',
  })
  gender: string;

  @ApiPropertyOptional({
    description: 'Reservation community category as per Kerala PSC',
    example: 'obc',
    enum: [
      'general',
      'obc',
      'ezhava',
      'muslim',
      'latin_catholic',
      'obx',
      'viswakarma',
      'dheevara',
      'sc',
      'st',
      'ews',
      'other',
    ],
  })
  @IsOptional()
  @IsIn(
    [
      'general',
      'obc',
      'ezhava',
      'muslim',
      'latin_catholic',
      'obx',
      'viswakarma',
      'dheevara',
      'sc',
      'st',
      'ews',
      'other',
    ],
    { message: 'communityCategory must be a valid community category' },
  )
  communityCategory?: string;

  @ApiPropertyOptional({
    description: 'Whether the aspirant is a native of Kerala',
    example: true,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'isKeralaNative must be a boolean value' })
  isKeralaNative?: boolean;

  @ApiPropertyOptional({
    description: 'Level of Malayalam language proficiency',
    example: 'fluent',
    enum: ['none', 'basic', 'intermediate', 'fluent', 'native'],
  })
  @IsOptional()
  @IsIn(['none', 'basic', 'intermediate', 'fluent', 'native'], {
    message:
      'malayalamProficiency must be one of: none, basic, intermediate, fluent, native',
  })
  malayalamProficiency?: string;

  @ApiPropertyOptional({
    description: 'Preferred language for content',
    example: 'ml',
    enum: ['ml', 'en'],
    default: 'ml',
  })
  @IsOptional()
  @IsIn(['ml', 'en'], { message: 'preferredLanguage must be one of: ml, en' })
  preferredLanguage?: string;

  @ApiPropertyOptional({
    description: 'ID of the user creating this profile',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'createdBy must be a number' })
  createdBy?: number;
}
