import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Question } from './entities/question.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { AnswerQuestionDto } from './dto/answer-question.dto';
import { QuizResultDto } from './dto/quiz-result.dto';
import {
  BulkQuestionsDto,
  BulkQuestionsResponseDto,
} from './dto/bulk-questions.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}

  async create(
    createQuestionDto: CreateQuestionDto,
    createdBy: number,
  ): Promise<Question> {
    const { courseId, answers, correctAnswer, ...otherFields } =
      createQuestionDto;

    // Validate that correct answer is in the answers array
    if (!answers.includes(correctAnswer)) {
      throw new BadRequestException(
        'Correct answer must be one of the provided answer choices',
      );
    }

    // Shuffle the answers array
    const shuffledAnswers = this.shuffleArray([...answers]);

    const question = this.questionRepository.create({
      ...otherFields,
      courseId,
      answers: shuffledAnswers,
      correctAnswer,
      createdBy,
      isActive: otherFields.isActive ?? true,
      difficulty: otherFields.difficulty ?? 1,
      points: otherFields.points ?? 10,
    });

    return await this.questionRepository.save(question);
  }

  async findAll(courseId?: number): Promise<Question[]> {
    const whereCondition = courseId
      ? { courseId, isActive: true }
      : { isActive: true };

    return await this.questionRepository.find({
      where: whereCondition,
      relations: ['course', 'creator', 'updater'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Question> {
    const question = await this.questionRepository.findOne({
      where: { id, isActive: true },
      relations: ['course', 'creator', 'updater'],
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${id} not found`);
    }

    return question;
  }

  async findByCourse(courseId: number): Promise<Question[]> {
    return await this.questionRepository.find({
      where: { courseId, isActive: true },
      relations: ['course', 'creator', 'updater'],
      order: { createdAt: 'DESC' },
    });
  }

  async update(
    id: number,
    updateQuestionDto: UpdateQuestionDto,
    updatedBy: number,
  ): Promise<Question> {
    const question = await this.findOne(id);

    // If updating answers or correct answer, validate them
    if (updateQuestionDto.answers || updateQuestionDto.correctAnswer) {
      const answers = updateQuestionDto.answers || question.answers;
      const correctAnswer =
        updateQuestionDto.correctAnswer || question.correctAnswer;

      if (!answers.includes(correctAnswer)) {
        throw new BadRequestException(
          'Correct answer must be one of the provided answer choices',
        );
      }

      // Shuffle the answers if they're being updated
      if (updateQuestionDto.answers) {
        updateQuestionDto.answers = this.shuffleArray([...answers]);
      }
    }

    Object.assign(question, updateQuestionDto);
    question.updatedBy = updatedBy;

    return await this.questionRepository.save(question);
  }

  async remove(id: number): Promise<{ message: string }> {
    const question = await this.findOne(id);

    await this.questionRepository.remove(question);

    return { message: 'Question deleted successfully' };
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const question = await this.findOne(id);

    question.isActive = false;
    await this.questionRepository.save(question);

    return { message: 'Question deactivated successfully' };
  }

  async answerQuestion(
    answerQuestionDto: AnswerQuestionDto,
  ): Promise<QuizResultDto> {
    const { questionId, selectedAnswer } = answerQuestionDto;

    const question = await this.findOne(questionId);

    const isCorrect = selectedAnswer === question.correctAnswer;
    const points = isCorrect ? question.points : 0;

    return {
      questionId: question.id,
      question: question.question,
      selectedAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      points,
      explanation: question.explanation,
    };
  }

  async getRandomQuestions(
    courseId: number,
    limit: number = 10,
  ): Promise<Question[]> {
    const questions = await this.questionRepository
      .createQueryBuilder('question')
      .where('question.courseId = :courseId', { courseId })
      .andWhere('question.isActive = :isActive', { isActive: true })
      .orderBy('RANDOM()')
      .limit(limit)
      .getMany();

    return questions;
  }

  async getQuestionsByDifficulty(
    courseId: number,
    difficulty: number,
  ): Promise<Question[]> {
    return await this.questionRepository.find({
      where: { courseId, difficulty, isActive: true },
      relations: ['course', 'creator'],
      order: { createdAt: 'DESC' },
    });
  }

  async getQuestionsByTags(
    courseId: number,
    tags: string[],
  ): Promise<Question[]> {
    return await this.questionRepository
      .createQueryBuilder('question')
      .where('question.courseId = :courseId', { courseId })
      .andWhere('question.isActive = :isActive', { isActive: true })
      .andWhere('question.tags && :tags', { tags })
      .getMany();
  }

  async getQuestionStats(courseId: number): Promise<{
    totalQuestions: number;
    byDifficulty: Record<number, number>;
    byTags: Record<string, number>;
    averagePoints: number;
  }> {
    const questions = await this.findByCourse(courseId);

    const stats = {
      totalQuestions: questions.length,
      byDifficulty: {} as Record<number, number>,
      byTags: {} as Record<string, number>,
      averagePoints: 0,
    };

    let totalPoints = 0;

    questions.forEach((question) => {
      // Count by difficulty
      stats.byDifficulty[question.difficulty] =
        (stats.byDifficulty[question.difficulty] || 0) + 1;

      // Count by tags
      question.tags?.forEach((tag) => {
        stats.byTags[tag] = (stats.byTags[tag] || 0) + 1;
      });

      totalPoints += question.points;
    });

    stats.averagePoints =
      questions.length > 0 ? totalPoints / questions.length : 0;

    return stats;
  }

  async getBulkQuestions(
    bulkQuestionsDto: BulkQuestionsDto,
  ): Promise<BulkQuestionsResponseDto> {
    const { questionIds } = bulkQuestionsDto;

    // Get all questions that match the provided IDs using IN clause
    const questions = await this.questionRepository.find({
      where: {
        id: In(questionIds),
        isActive: true,
      },
      relations: ['course', 'creator', 'updater'],
      order: { createdAt: 'DESC' },
    });

    // Find which IDs were not found
    const foundIds = questions.map((q) => q.id);
    const notFound = questionIds.filter((id) => !foundIds.includes(id));

    // Format the response
    const formattedQuestions = questions.map((question) => ({
      id: question.id,
      questionText: question.question,
      choices: question.answers,
      correctAnswer: question.correctAnswer,
      description: question.description,
      descriptionLink: question.descriptionLink,
      explanation: question.explanation,
      difficulty: question.difficulty,
      points: question.points,
      tags: question.tags || [],
    }));

    return {
      questions: formattedQuestions,
      notFound,
      totalFound: questions.length,
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}
