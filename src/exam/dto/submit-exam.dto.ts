import { IsInt, IsNotEmpty, IsObject, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({
    description:
      'Optional map of question IDs to seconds spent on that question. ' +
      'Recorded per answer for the time-per-question analytics. Omit it, or ' +
      'omit individual questions, and those answers are stored with no ' +
      'timing rather than a zero.',
    example: {
      '1': 42,
      '2': 17,
    },
    type: 'object',
    additionalProperties: {
      type: 'number',
    },
  })
  @IsOptional()
  @IsObject()
  timings?: Record<string, number>; // Map of questionId (as string) -> seconds
}

