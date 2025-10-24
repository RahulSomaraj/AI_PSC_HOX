import { IsString, IsNotEmpty, IsNumber } from 'class-validator';

export class AnswerQuestionDto {
  @IsString()
  @IsNotEmpty()
  selectedAnswer: string;

  @IsNumber()
  @IsNotEmpty()
  questionId: number;
}
