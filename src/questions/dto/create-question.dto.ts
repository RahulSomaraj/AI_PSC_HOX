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
  IsEnum,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  QuestionLanguage,
  QuestionStatus,
  QuestionType,
} from '../question-fields.enum';

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

  // No @IsNotEmpty: a draft may be saved before an answer is marked, and the
  // console then sends ''. A *published* question must have one, and it must
  // be among `answers` - QuestionsService enforces that, since it depends on
  // `status` and a field decorator cannot see its neighbours.
  @ApiProperty({
    description:
      'The correct answer (must match one of the answers). May be empty on a draft; required once published.',
    example: 'Paris',
  })
  @IsString()
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

  // ── The Question Bank's fields (BACKEND_ISSUES.md P1-1) ──────────────────

  @ApiPropertyOptional({
    enum: QuestionStatus,
    default: QuestionStatus.Draft,
    description:
      'Editing state. Defaults to draft. Publishing requires a correct answer that is one of the answers.',
  })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;

  @ApiPropertyOptional({
    enum: QuestionLanguage,
    default: QuestionLanguage.English,
  })
  @IsOptional()
  @IsEnum(QuestionLanguage)
  language?: QuestionLanguage;

  @ApiPropertyOptional({
    description: 'Time allowed, in seconds. May be empty on a draft.',
    example: 60,
    nullable: true,
  })
  @IsOptional()
  @IsInt({ message: 'timeSeconds must be an integer' })
  @Min(1, { message: 'timeSeconds must be at least 1' })
  timeSeconds?: number | null;

  @ApiPropertyOptional({
    description:
      'Image or diagram - the `fileUrl` returned by POST /uploads (purpose `question`).',
    nullable: true,
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(2048)
  imageUrl?: string | null;

  // ── Accepted and ignored ─────────────────────────────────────────────────
  //
  // The console sends these three on every save, always as null: the Add
  // Question form has no field for any of them. They are declared only so
  // `forbidNonWhitelisted` does not turn every save into a 400. They are NOT
  // stored - P1-1 asks that the columns wait for Q33, since nothing could
  // write them. Responses carry them back as null.

  @ApiPropertyOptional({
    enum: QuestionType,
    nullable: true,
    deprecated: true,
    description: 'Ignored until Q33 is settled. Always returned as null.',
  })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType | null;

  @ApiPropertyOptional({
    nullable: true,
    deprecated: true,
    description: 'Ignored until Q33 is settled. Always returned as null.',
  })
  @IsOptional()
  @IsInt()
  year?: number | null;

  @ApiPropertyOptional({
    nullable: true,
    deprecated: true,
    description: 'Ignored until Q33 is settled. Always returned as null.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  examLevelId?: number | null;
}
