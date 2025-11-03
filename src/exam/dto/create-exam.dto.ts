import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';

export class CreateExamDto {
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30)
  maxQuestions?: number; // Defaults to 30, max 30

  @IsInt()
  @IsOptional()
  durationMinutes?: number; // Optional duration limit
}


