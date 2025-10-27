import {
  IsString,
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  ArrayMaxSize,
  IsNumber,
  IsOptional,
  IsUrl,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

export class CreateQuestionDto {
  @IsNumber()
  @IsNotEmpty()
  courseId: number;

  @IsString()
  @IsNotEmpty()
  question: string;

  @IsArray()
  @ArrayMinSize(4, { message: 'Answers must have exactly 4 choices' })
  @ArrayMaxSize(4, { message: 'Answers must have exactly 4 choices' })
  @IsString({ each: true })
  answers: string[];

  @IsString()
  @IsNotEmpty()
  correctAnswer: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl({}, { message: 'Description link must be a valid URL' })
  @IsOptional()
  descriptionLink?: string;

  @IsNumber()
  @Min(1, { message: 'Difficulty must be between 1 and 5' })
  @Max(5, { message: 'Difficulty must be between 1 and 5' })
  @IsOptional()
  difficulty?: number;

  @IsNumber()
  @Min(1, { message: 'Points must be at least 1' })
  @IsOptional()
  points?: number;

  @IsString()
  @IsOptional()
  explanation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
