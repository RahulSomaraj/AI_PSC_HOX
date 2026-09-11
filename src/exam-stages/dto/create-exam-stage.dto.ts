import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { ExamMode } from '../../common/enums/exam-mode.enum';

export class CreateExamStageDto {
  @ApiProperty({
    description: 'ID of the exam this stage belongs to',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examId: number;

  @ApiProperty({
    description: 'Name of the stage',
    example: 'Preliminary Examination',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'Position of the stage within the exam (ascending)',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stageOrder?: number;

  @ApiPropertyOptional({
    description: 'How the stage is conducted',
    enum: ExamMode,
    example: ExamMode.Objective,
  })
  @IsOptional()
  @IsEnum(ExamMode)
  examMode?: ExamMode;

  @ApiPropertyOptional({
    description: 'Number of questions in the stage',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalQuestions?: number;

  @ApiPropertyOptional({
    description: 'Total marks for the stage',
    example: 100,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalMarks?: number;

  @ApiPropertyOptional({
    description: 'Duration of the stage in minutes',
    example: 75,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationMinutes?: number;

  @ApiPropertyOptional({
    description: 'Marks deducted for a wrong answer',
    example: 0.33,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  negativeMark?: number;

  @ApiPropertyOptional({
    description: 'Description of the stage',
    example: 'Objective type screening test held across the state',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the stage is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
