import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExamQuestionDto {
  @ApiProperty({ description: 'Question ID', example: 1 })
  id: number;

  @ApiProperty({ description: 'Question text', example: 'What is the capital of France?' })
  question: string;

  @ApiProperty({
    description: 'Array of answer choices',
    example: ['Paris', 'London', 'Berlin', 'Madrid'],
    type: [String],
  })
  choices: string[];

  @ApiProperty({ description: 'Points awarded for correct answer', example: 5 })
  points: number;

  @ApiProperty({ description: 'Difficulty level (1-5)', example: 2 })
  difficulty: number;
}

export class ExamResponseDto {
  @ApiProperty({ description: 'Exam ID', example: 1 })
  examId: number;

  @ApiProperty({ description: 'Course ID', example: 1 })
  courseId: number;

  @ApiProperty({ description: 'Course name', example: 'Geography Quiz' })
  courseName: string;

  @ApiProperty({
    description: 'Exam status',
    example: 'pending',
    enum: ['pending', 'in_progress', 'completed'],
  })
  status: string;

  @ApiProperty({ description: 'Maximum number of questions', example: 30 })
  maxQuestions: number;

  @ApiProperty({ description: 'Total number of questions in the exam', example: 25 })
  totalQuestions: number;

  @ApiPropertyOptional({
    description: 'When the exam was started',
    example: '2025-10-29T10:00:00Z',
    nullable: true,
  })
  startedAt: Date | null;

  @ApiPropertyOptional({
    description: 'When the exam was completed',
    example: '2025-10-29T11:00:00Z',
    nullable: true,
  })
  completedAt: Date | null;

  @ApiPropertyOptional({
    description: 'Duration limit in minutes',
    example: 60,
    nullable: true,
  })
  durationMinutes: number | null;

  @ApiProperty({
    description: 'Array of exam questions',
    type: [ExamQuestionDto],
  })
  questions: ExamQuestionDto[];

  @ApiPropertyOptional({
    description: 'Time remaining in seconds (only if exam is in progress)',
    example: 1800,
  })
  timeRemaining?: number; // Seconds remaining if in progress
}

export class ExamResultDto {
  @ApiProperty({ description: 'Exam ID', example: 1 })
  examId: number;

  @ApiProperty({ description: 'Course ID', example: 1 })
  courseId: number;

  @ApiProperty({ description: 'Course name', example: 'Geography Quiz' })
  courseName: string;

  @ApiProperty({
    description: 'Exam status (should be completed)',
    example: 'completed',
  })
  status: string;

  @ApiProperty({ description: 'Score obtained', example: 75 })
  score: number;

  @ApiProperty({ description: 'Total possible score', example: 100 })
  totalPossibleScore: number;

  @ApiProperty({ description: 'Percentage score', example: 75.0 })
  percentage: number;

  @ApiProperty({ description: 'Total number of questions', example: 20 })
  totalQuestions: number;

  @ApiProperty({ description: 'Number of correct answers', example: 15 })
  correctAnswers: number;

  @ApiProperty({ description: 'Number of wrong answers', example: 5 })
  wrongAnswers: number;

  @ApiProperty({
    description: 'Detailed results for each question',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        questionId: { type: 'number', example: 1 },
        question: { type: 'string', example: 'What is the capital of France?' },
        selectedAnswer: { type: 'string', example: 'Paris' },
        correctAnswer: { type: 'string', example: 'Paris' },
        isCorrect: { type: 'boolean', example: true },
        points: { type: 'number', example: 5 },
        explanation: { type: 'string', example: 'Paris is the capital of France', nullable: true },
      },
    },
  })
  questions: {
    questionId: number;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
    explanation?: string;
  }[];

  @ApiProperty({ description: 'When the exam was started', example: '2025-10-29T10:00:00Z' })
  startedAt: Date;

  @ApiProperty({ description: 'When the exam was completed', example: '2025-10-29T11:00:00Z' })
  completedAt: Date;
}


