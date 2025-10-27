import { IsArray, IsInt, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class BulkQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50) // Reasonable limit to prevent abuse
  @IsInt({ each: true })
  questionIds: number[];
}

export class BulkQuestionsResponseDto {
  questions: Array<{
    id: number;
    questionText: string;
    choices: string[];
    correctAnswer: string;
    description?: string;
    descriptionLink?: string;
    explanation?: string;
    difficulty: number;
    points: number;
    tags: string[];
  }>;
  notFound: number[]; // IDs that weren't found
  totalFound: number;
}
