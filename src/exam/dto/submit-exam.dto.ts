import { IsInt, IsNotEmpty, IsObject } from 'class-validator';

export class SubmitExamDto {
  @IsInt()
  @IsNotEmpty()
  examId: number;

  @IsObject()
  @IsNotEmpty()
  answers: Record<string, string>; // Map of questionId (as string) -> selected answer
}

