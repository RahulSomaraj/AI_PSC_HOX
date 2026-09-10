<<<<<<< HEAD
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
=======
import { Transform, Type } from 'class-transformer';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
<<<<<<< HEAD
  MaxLength,
  Min,
} from 'class-validator';
=======
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import { ExamMode } from '../../common/enums/exam-mode.enum';

export class CreateExamStageDto {
  @ApiProperty({
<<<<<<< HEAD
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
=======
    description: 'ID of the exam post this stage belongs to',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'examPostId is required' })
  @Type(() => Number)
  @IsInt({ message: 'examPostId must be an integer' })
  @Min(1, { message: 'examPostId must be at least 1' })
  examPostId: number;

  @ApiProperty({
    description: 'Stage name - unique within its post among live stages',
    example: 'Preliminary',
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  @MaxLength(150, { message: 'Name must be at most 150 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name: string;

  @ApiPropertyOptional({
    description:
      'Which sitting comes first, ascending. Not unique within a post - ' +
      'reordering a sequence passes through duplicate values.',
    example: 1,
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'stageOrder must be an integer' })
  @Min(0, { message: 'stageOrder must be at least 0' })
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  stageOrder?: number;

  @ApiPropertyOptional({
    description: 'How the stage is conducted',
    enum: ExamMode,
    example: ExamMode.Objective,
<<<<<<< HEAD
  })
  @IsOptional()
  @IsEnum(ExamMode)
=======
    default: ExamMode.Objective,
  })
  @IsOptional()
  @IsEnum(ExamMode, {
    message:
      'examMode must be one of: objective, descriptive, practical, physical, interview, document_verification, other',
  })
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  examMode?: ExamMode;

  @ApiPropertyOptional({
    description: 'Number of questions in the stage',
    example: 100,
<<<<<<< HEAD
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
=======
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'totalQuestions must be an integer' })
  @Min(0, { message: 'totalQuestions must be at least 0' })
  totalQuestions?: number;

  // Sent as a number, stored as numeric(8,2). The @Max guards that precision:
  // a larger value would be rejected by Postgres as a numeric overflow, which
  // would surface as a 500 rather than a validation error.
  @ApiPropertyOptional({
    description: 'Total marks for the stage, to two decimal places',
    example: 100,
    minimum: 0,
    maximum: 999999.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'totalMarks must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'totalMarks must be at least 0' })
  @Max(999999.99, { message: 'totalMarks must be at most 999999.99' })
  totalMarks?: number;

  @ApiPropertyOptional({
    description: 'Time allowed for the stage, in minutes',
    example: 75,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'durationMinutes must be an integer' })
  @Min(1, { message: 'durationMinutes must be at least 1' })
  durationMinutes?: number;

  // Stored positive: 0.33 means a third of a mark comes off per wrong answer.
  // numeric(5,2), so the ceiling is 999.99 for the same reason as totalMarks.
  @ApiPropertyOptional({
    description:
      'Marks deducted per wrong answer, given as a positive number. 0 means ' +
      'no negative marking.',
    example: 0.33,
    minimum: 0,
    maximum: 999.99,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: 'negativeMark must be a number with at most 2 decimal places' },
  )
  @Min(0, { message: 'negativeMark must be at least 0' })
  @Max(999.99, { message: 'negativeMark must be at most 999.99' })
  negativeMark?: number;

  @ApiPropertyOptional({
    description: 'Longer description of the stage',
    example: 'Objective screening test held across all districts.',
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the stage is active',
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
