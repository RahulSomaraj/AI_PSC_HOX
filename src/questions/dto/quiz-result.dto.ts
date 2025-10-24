import { IsNumber, IsString, IsBoolean, IsOptional } from 'class-validator';

export class QuizResultDto {
  @IsNumber()
  questionId: number;

  @IsString()
  question: string;

  @IsString()
  selectedAnswer: string;

  @IsString()
  correctAnswer: string;

  @IsBoolean()
  isCorrect: boolean;

  @IsNumber()
  points: number;

  @IsString()
  @IsOptional()
  explanation?: string;
}
