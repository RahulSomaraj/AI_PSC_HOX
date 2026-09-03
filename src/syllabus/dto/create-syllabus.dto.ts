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

export class CreateSyllabusDto {
  @ApiProperty({ description: 'ID of the exam', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examId: number;

  @ApiProperty({
    description: 'ID of the exam stage the syllabus belongs to',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examStageId: number;

  @ApiPropertyOptional({
    description: 'Title of the syllabus',
    example: 'SI of Police - Preliminary Examination Syllabus',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Notes about the syllabus',
    example: 'As per the 2024 notification',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the syllabus is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
