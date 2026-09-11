import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsInt,
  IsOptional,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AnswerQuestionDto {
  @ApiProperty({
    description: 'The answer selected by the user',
    example: 'Paris',
  })
  @IsString()
  @IsNotEmpty()
  selectedAnswer: string;

  @ApiProperty({
    description: 'ID of the question being answered',
    example: 1,
    type: Number,
  })
  @IsNumber()
  @IsNotEmpty()
  questionId: number;

  @ApiPropertyOptional({
    description:
      'Seconds spent on this question, if the client measures it. Omit it ' +
      'and the answer is recorded with no timing rather than a zero, so ' +
      '"not measured" stays distinguishable from "answered instantly".',
    example: 42,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'timeTakenSec must be an integer' })
  @Min(0, { message: 'timeTakenSec must be at least 0' })
  timeTakenSec?: number;
}
