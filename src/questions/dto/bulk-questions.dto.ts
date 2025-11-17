import { IsArray, IsInt, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkQuestionsDto {
  @ApiProperty({
    description: 'Array of question IDs to retrieve (1-50 questions)',
    example: [1, 2, 3, 4, 5],
    type: [Number],
    minItems: 1,
    maxItems: 50,
  })
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
