export class ExamQuestionDto {
  id: number;
  question: string;
  choices: string[];
  points: number;
  difficulty: number;
}

export class ExamResponseDto {
  examId: number;
  courseId: number;
  courseName: string;
  status: string;
  maxQuestions: number;
  totalQuestions: number;
  startedAt: Date | null;
  completedAt: Date | null;
  durationMinutes: number | null;
  questions: ExamQuestionDto[];
  timeRemaining?: number; // Seconds remaining if in progress
}

export class ExamResultDto {
  examId: number;
  courseId: number;
  courseName: string;
  status: string;
  score: number;
  totalPossibleScore: number;
  percentage: number;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  questions: {
    questionId: number;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    points: number;
    explanation?: string;
  }[];
  startedAt: Date;
  completedAt: Date;
}


