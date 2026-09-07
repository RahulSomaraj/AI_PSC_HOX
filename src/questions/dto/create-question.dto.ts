import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsInt,
  IsNumber,
  IsOptional,
  IsUrl,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateQuestionDto {
  @ApiProperty({
    description: 'ID of the course this question belongs to',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @ApiPropertyOptional({
    description:
      'Subject this question is tagged to. Required whenever topicId is ' +
      'given. Send null to clear the tagging.',
    example: 1,
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'subjectId must be an integer' })
  @Min(1, { message: 'subjectId must be at least 1' })
  subjectId?: number | null;

  @ApiPropertyOptional({
    description:
      'Topic this question is tagged to. Must belong to subjectId, and ' +
      'subjectId must be set. Send null to clear it.',
    example: 1,
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'topicId must be an integer' })
  @Min(1, { message: 'topicId must be at least 1' })
  topicId?: number | null;

  @ApiPropertyOptional({
    description:
      'Subtopic this question is tagged to. Must belong to topicId, and ' +
      'topicId must be set. Send null to clear it.',
    example: 1,
    type: Number,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'subtopicId must be an integer' })
  @Min(1, { message: 'subtopicId must be at least 1' })
  subtopicId?: number | null;

  @ApiProperty({
    description: 'The question text',
    example: 'What is the capital of France?',
  })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({
    description: 'Array of 4 answer choices',
    example: ['Paris', 'London', 'Berlin', 'Madrid'],
    type: [String],
    minItems: 4,
    maxItems: 4,
  })
  @IsArray()
  @ArrayMinSize(4, { message: 'Answers must have exactly 4 choices' })
  @ArrayMaxSize(4, { message: 'Answers must have exactly 4 choices' })
  @IsString({ each: true })
  answers: string[];

  @ApiProperty({
    description: 'The correct answer (must match one of the answers)',
    example: 'Paris',
  })
  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @ApiPropertyOptional({
    description: 'Additional description or context for the question',
    example: 'This question tests knowledge of European capitals',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'URL link providing additional information',
    example: 'https://example.com/geography/capitals',
  })
  @IsUrl({}, { message: 'Description link must be a valid URL' })
  @IsOptional()
  descriptionLink?: string;

  @ApiPropertyOptional({
    description: 'Difficulty level from 1 (easiest) to 5 (hardest)',
    example: 2,
    minimum: 1,
    maximum: 5,
    default: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Difficulty must be between 1 and 5' })
  @Max(5, { message: 'Difficulty must be between 1 and 5' })
  @IsOptional()
  difficulty?: number;

  @ApiPropertyOptional({
    description: 'Points awarded for correct answer',
    example: 5,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1, { message: 'Points must be at least 1' })
  @IsOptional()
  points?: number;

  @ApiPropertyOptional({
    description: 'Explanation of the correct answer',
    example: 'Paris has been the capital of France since 987 AD',
  })
  @IsString()
  @IsOptional()
  explanation?: string;

  @ApiPropertyOptional({
    description: 'Tags for categorizing the question',
    example: ['geography', 'europe', 'capitals'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({
    description: 'Whether the question is active',
    example: true,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
