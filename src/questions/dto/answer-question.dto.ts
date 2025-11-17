import { IsString, IsNotEmpty, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
}
