import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('QuestionsController - API Tests', () => {
  let controller: QuestionsController;
  let questionsService: QuestionsService;

  const mockQuestionsService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByCourse: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn(),
    answerQuestion: jest.fn(),
    getRandomQuestions: jest.fn(),
    getQuestionsByDifficulty: jest.fn(),
    getQuestionsByTags: jest.fn(),
    getQuestionStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuestionsController],
      providers: [
        {
          provide: QuestionsService,
          useValue: mockQuestionsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<QuestionsController>(QuestionsController);
    questionsService = module.get<QuestionsService>(QuestionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /questions (create)', () => {
    it('should create a new question', async () => {
      const createQuestionDto: CreateQuestionDto = {
        courseId: 1,
        question: 'What is the capital of France?',
        answers: ['Paris', 'London', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        description: 'A question about European capitals',
        descriptionLink: 'https://example.com/capitals',
        difficulty: 2,
        points: 10,
        explanation: 'Paris is the capital and largest city of France',
        tags: ['geography', 'europe'],
        isActive: true,
      };

      const expectedResult = {
        id: 1,
        courseId: 1,
        question: 'What is the capital of France?',
        answers: ['Paris', 'London', 'Berlin', 'Madrid'], // Shuffled
        correctAnswer: 'Paris',
        description: 'A question about European capitals',
        descriptionLink: 'https://example.com/capitals',
        difficulty: 2,
        points: 10,
        explanation: 'Paris is the capital and largest city of France',
        tags: ['geography', 'europe'],
        isActive: true,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuestionsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createQuestionDto, 1);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(createQuestionDto, 1);
    });

    it('should create a question with minimal data', async () => {
      const createQuestionDto: CreateQuestionDto = {
        courseId: 1,
        question: 'What is 2+2?',
        answers: ['3', '4', '5', '6'],
        correctAnswer: '4',
      };

      const expectedResult = {
        id: 2,
        courseId: 1,
        question: 'What is 2+2?',
        answers: ['4', '3', '5', '6'], // Shuffled
        correctAnswer: '4',
        difficulty: 1,
        points: 10,
        isActive: true,
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockQuestionsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createQuestionDto, 1);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(createQuestionDto, 1);
    });
  });

  describe('GET /questions (findAll)', () => {
    it('should return all questions', async () => {
      const expectedResult = [
        {
          id: 1,
          question: 'What is the capital of France?',
          courseId: 1,
          answers: ['Paris', 'London', 'Berlin', 'Madrid'],
          correctAnswer: 'Paris',
          difficulty: 2,
          points: 10,
          isActive: true,
        },
        {
          id: 2,
          question: 'What is 2+2?',
          courseId: 1,
          answers: ['3', '4', '5', '6'],
          correctAnswer: '4',
          difficulty: 1,
          points: 10,
          isActive: true,
        },
      ];

      mockQuestionsService.findAll.mockResolvedValue(expectedResult);

      const result = await controller.findAll();

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.findAll).toHaveBeenCalled();
    });

    it('should return questions for specific course', async () => {
      const courseId = 1;
      const expectedResult = [
        {
          id: 1,
          question: 'What is the capital of France?',
          courseId: 1,
          answers: ['Paris', 'London', 'Berlin', 'Madrid'],
          correctAnswer: 'Paris',
        },
      ];

      mockQuestionsService.findByCourse.mockResolvedValue(expectedResult);

      const result = await controller.findAll(courseId);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.findByCourse).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /questions/random (getRandomQuestions)', () => {
    it('should return random questions for a course', async () => {
      const courseId = 1;
      const limit = 5;
      const expectedResult = [
        {
          id: 1,
          question: 'Random question 1',
          courseId: 1,
          answers: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
        },
        {
          id: 2,
          question: 'Random question 2',
          courseId: 1,
          answers: ['X', 'Y', 'Z', 'W'],
          correctAnswer: 'X',
        },
      ];

      mockQuestionsService.getRandomQuestions.mockResolvedValue(expectedResult);

      const result = await controller.getRandomQuestions(courseId, limit);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.getRandomQuestions).toHaveBeenCalledWith(1, 5);
    });
  });

  describe('GET /questions/difficulty/:difficulty (getQuestionsByDifficulty)', () => {
    it('should return questions by difficulty level', async () => {
      const difficulty = 3;
      const courseId = 1;
      const expectedResult = [
        {
          id: 1,
          question: 'Hard question',
          courseId: 1,
          difficulty: 3,
          answers: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
        },
      ];

      mockQuestionsService.getQuestionsByDifficulty.mockResolvedValue(expectedResult);

      const result = await controller.getQuestionsByDifficulty(difficulty, courseId);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.getQuestionsByDifficulty).toHaveBeenCalledWith(1, 3);
    });
  });

  describe('GET /questions/tags (getQuestionsByTags)', () => {
    it('should return questions by tags', async () => {
      const courseId = 1;
      const tags = 'geography,europe';
      const expectedResult = [
        {
          id: 1,
          question: 'Geography question',
          courseId: 1,
          tags: ['geography', 'europe'],
          answers: ['A', 'B', 'C', 'D'],
          correctAnswer: 'A',
        },
      ];

      mockQuestionsService.getQuestionsByTags.mockResolvedValue(expectedResult);

      const result = await controller.getQuestionsByTags(courseId, tags);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.getQuestionsByTags).toHaveBeenCalledWith(1, ['geography', 'europe']);
    });
  });

  describe('GET /questions/stats/:courseId (getQuestionStats)', () => {
    it('should return question statistics for a course', async () => {
      const courseId = 1;
      const expectedResult = {
        totalQuestions: 10,
        byDifficulty: { 1: 3, 2: 4, 3: 2, 4: 1, 5: 0 },
        byTags: { 'geography': 5, 'math': 3, 'science': 2 },
        averagePoints: 12.5,
      };

      mockQuestionsService.getQuestionStats.mockResolvedValue(expectedResult);

      const result = await controller.getQuestionStats(courseId);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.getQuestionStats).toHaveBeenCalledWith(1);
    });
  });

  describe('GET /questions/:id (findOne)', () => {
    it('should return a specific question', async () => {
      const questionId = 1;
      const expectedResult = {
        id: 1,
        question: 'What is the capital of France?',
        courseId: 1,
        answers: ['Paris', 'London', 'Berlin', 'Madrid'],
        correctAnswer: 'Paris',
        difficulty: 2,
        points: 10,
        isActive: true,
      };

      mockQuestionsService.findOne.mockResolvedValue(expectedResult);

      const result = await controller.findOne(questionId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.findOne).toHaveBeenCalledWith(1);
    });

    it('should handle non-existent question', async () => {
      const questionId = 999;
      const errorMessage = 'Question with ID 999 not found';
      mockQuestionsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(questionId.toString())).rejects.toThrow(errorMessage);
      expect(mockQuestionsService.findOne).toHaveBeenCalledWith(999);
    });
  });

  describe('PATCH /questions/:id (update)', () => {
    it('should update a question', async () => {
      const questionId = 1;
      const updateQuestionDto: UpdateQuestionDto = {
        question: 'Updated question text',
        difficulty: 3,
        points: 15,
      };

      const expectedResult = {
        id: 1,
        question: 'Updated question text',
        difficulty: 3,
        points: 15,
        updatedBy: 1,
        updatedAt: new Date(),
      };

      mockQuestionsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(questionId.toString(), updateQuestionDto, 1);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.update).toHaveBeenCalledWith(1, updateQuestionDto, 1);
    });

    it('should handle partial updates', async () => {
      const questionId = 1;
      const updateQuestionDto: UpdateQuestionDto = {
        difficulty: 4,
      };

      const expectedResult = {
        id: 1,
        difficulty: 4,
        updatedBy: 1,
        updatedAt: new Date(),
      };

      mockQuestionsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(questionId.toString(), updateQuestionDto, 1);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.update).toHaveBeenCalledWith(1, updateQuestionDto, 1);
    });
  });

  describe('DELETE /questions/:id (remove)', () => {
    it('should delete a question', async () => {
      const questionId = 1;
      const expectedResult = {
        message: 'Question deleted successfully',
      };

      mockQuestionsService.remove.mockResolvedValue(expectedResult);

      const result = await controller.remove(questionId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.remove).toHaveBeenCalledWith(1);
    });
  });

  describe('DELETE /questions/:id/deactivate (softDelete)', () => {
    it('should deactivate a question', async () => {
      const questionId = 1;
      const expectedResult = {
        message: 'Question deactivated successfully',
      };

      mockQuestionsService.softDelete.mockResolvedValue(expectedResult);

      const result = await controller.softDelete(questionId.toString());

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('POST /questions/answer (answerQuestion)', () => {
    it('should answer a question correctly', async () => {
      const answerQuestionDto: AnswerQuestionDto = {
        questionId: 1,
        selectedAnswer: 'Paris',
      };

      const expectedResult = {
        questionId: 1,
        question: 'What is the capital of France?',
        selectedAnswer: 'Paris',
        correctAnswer: 'Paris',
        isCorrect: true,
        points: 10,
        explanation: 'Paris is the capital and largest city of France',
      };

      mockQuestionsService.answerQuestion.mockResolvedValue(expectedResult);

      const result = await controller.answerQuestion(answerQuestionDto);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.answerQuestion).toHaveBeenCalledWith(answerQuestionDto);
    });

    it('should handle incorrect answer', async () => {
      const answerQuestionDto: AnswerQuestionDto = {
        questionId: 1,
        selectedAnswer: 'London',
      };

      const expectedResult = {
        questionId: 1,
        question: 'What is the capital of France?',
        selectedAnswer: 'London',
        correctAnswer: 'Paris',
        isCorrect: false,
        points: 0,
        explanation: 'Paris is the capital and largest city of France',
      };

      mockQuestionsService.answerQuestion.mockResolvedValue(expectedResult);

      const result = await controller.answerQuestion(answerQuestionDto);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.answerQuestion).toHaveBeenCalledWith(answerQuestionDto);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should handle JWT authentication for protected routes', async () => {
      const createQuestionDto: CreateQuestionDto = {
        courseId: 1,
        question: 'Test question',
        answers: ['A', 'B', 'C', 'D'],
        correctAnswer: 'A',
      };

      const expectedResult = {
        id: 1,
        courseId: 1,
        question: 'Test question',
        createdBy: 1,
      };

      mockQuestionsService.create.mockResolvedValue(expectedResult);

      const result = await controller.create(createQuestionDto, 1);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(createQuestionDto, 1);
    });

    it('should handle role-based access control', async () => {
      const questionId = 1;
      const updateQuestionDto: UpdateQuestionDto = {
        difficulty: 3,
      };

      const expectedResult = {
        id: 1,
        difficulty: 3,
        updatedBy: 1,
      };

      mockQuestionsService.update.mockResolvedValue(expectedResult);

      const result = await controller.update(questionId.toString(), updateQuestionDto, 1);

      expect(result).toEqual(expectedResult);
      expect(mockQuestionsService.update).toHaveBeenCalledWith(1, updateQuestionDto, 1);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const createQuestionDto: CreateQuestionDto = {
        courseId: 1,
        question: 'Invalid question',
        answers: ['A', 'B'], // Invalid: not 4 answers
        correctAnswer: 'C', // Invalid: not in answers
      };

      const errorMessage = 'Correct answer must be one of the provided answer choices';
      mockQuestionsService.create.mockRejectedValue(new Error(errorMessage));

      await expect(controller.create(createQuestionDto, 1)).rejects.toThrow(errorMessage);
      expect(mockQuestionsService.create).toHaveBeenCalledWith(createQuestionDto, 1);
    });

    it('should handle database connection errors', async () => {
      const questionId = 1;
      const errorMessage = 'Database connection failed';
      mockQuestionsService.findOne.mockRejectedValue(new Error(errorMessage));

      await expect(controller.findOne(questionId.toString())).rejects.toThrow(errorMessage);
      expect(mockQuestionsService.findOne).toHaveBeenCalledWith(1);
    });
  });
});
