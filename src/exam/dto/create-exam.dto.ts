import { IsInt, IsNotEmpty, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExamDto {
  @ApiProperty({
    description: 'ID of the course for which the exam is being created',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiPropertyOptional({
    description: 'Maximum number of questions (1-30, defaults to 30)',
    example: 30,
    type: Number,
    minimum: 1,
    maximum: 30,
    default: 30,
  })
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(30)
  maxQuestions?: number; // Defaults to 30, max 30

  @ApiPropertyOptional({
    description: 'Optional duration limit in minutes',
    example: 60,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  durationMinutes?: number; // Optional duration limit
}


