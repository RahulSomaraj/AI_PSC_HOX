import { IsInt, IsNotEmpty, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitExamDto {
  @ApiProperty({
    description: 'ID of the exam being submitted',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  examId: number;

  @ApiProperty({
    description: 'Object mapping question IDs (as strings) to selected answers',
    example: {
      '1': 'Paris',
      '2': 'Tokyo',
      '3': 'London',
    },
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
  })
  @IsObject()
  @IsNotEmpty()
  answers: Record<string, string>; // Map of questionId (as string) -> selected answer
}

