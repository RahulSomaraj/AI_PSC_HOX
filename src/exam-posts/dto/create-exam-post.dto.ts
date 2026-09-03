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

export class CreateExamPostDto {
  @ApiProperty({
    description: 'ID of the exam level this post belongs to',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examLevelId: number;

  @ApiProperty({
    description: 'Name of the exam / post',
    example: 'Sub Inspector of Police',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Short name or abbreviation',
    example: 'SI',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shortName?: string;

  @ApiPropertyOptional({
    description: 'Description of the post',
    example: 'Sub Inspector of Police in the Kerala Police Department',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Department that advertises the post',
    example: 'Kerala Police',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  department?: string;

  @ApiPropertyOptional({
    description: 'Minimum qualification required',
    example: 'Any degree from a recognised university',
  })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({
    description: 'Position of the exam in listings (ascending)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the exam is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
