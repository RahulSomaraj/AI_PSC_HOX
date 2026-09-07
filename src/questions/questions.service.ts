import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Question } from './entities/question.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { FindQuestionsQueryDto } from './dto/find-questions-query.dto';
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
    @InjectRepository(Subject)
    private subjectRepository: Repository<Subject>,
    @InjectRepository(Topic)
    private topicRepository: Repository<Topic>,
    @InjectRepository(Subtopic)
    private subtopicRepository: Repository<Subtopic>,
  ) {}

  /**
   * An incoming tag id, resolved against what the question already carries.
   * Absent means leave it alone; an explicit null means clear it.
   */
  private resolveTag(
    incoming: number | null | undefined,
    current: number | null,
  ): number | null {
    return incoming === undefined ? current : incoming;
  }

  /**
   * Validates a question's place in the academic hierarchy, given the ids it
   * will hold once the write lands - not just the ones in the request.
   *
   * That distinction is the whole point. A question tagged subject 1 /
   * topic 5 can be broken by a PATCH that only sends `subjectId: 2`: nothing
   * in the body is wrong on its own, but topic 5 does not belong to subject
   * 2, and checking only what was sent would let it through.
   *
   * Three rules, in the order they are cheapest to check:
   *   1. No gaps - a topic needs a subject, a subtopic needs a topic. A tag
   *      hanging off nothing cannot be rolled up by subject later.
   *   2. Each id exists and is not soft-deleted (404).
   *   3. Each id belongs to the one above it (400).
   */
  private async assertTaxonomy(
    subjectId: number | null,
    topicId: number | null,
    subtopicId: number | null,
  ): Promise<void> {
    if (topicId !== null && subjectId === null) {
      throw new BadRequestException(
        'subjectId is required when topicId is set',
      );
    }
    if (subtopicId !== null && topicId === null) {
      throw new BadRequestException(
        'topicId is required when subtopicId is set',
      );
    }

    if (subjectId !== null) {
      const subject = await this.subjectRepository.findOne({
        where: { id: subjectId, deletedAt: IsNull() },
        select: { id: true },
      });
      if (!subject) {
        throw new NotFoundException(`Subject with ID ${subjectId} not found`);
      }
    }

    if (topicId !== null) {
      // subjectId comes back too: it is what rule 3 compares against.
      const topic = await this.topicRepository.findOne({
        where: { id: topicId, deletedAt: IsNull() },
        select: { id: true, subjectId: true },
      });
      if (!topic) {
        throw new NotFoundException(`Topic with ID ${topicId} not found`);
      }
      if (topic.subjectId !== subjectId) {
        throw new BadRequestException(
          `Topic ${topicId} does not belong to subject ${subjectId}`,
        );
      }
    }

    if (subtopicId !== null) {
      const subtopic = await this.subtopicRepository.findOne({
        where: { id: subtopicId, deletedAt: IsNull() },
        select: { id: true, topicId: true },
      });
      if (!subtopic) {
        throw new NotFoundException(
          `Subtopic with ID ${subtopicId} not found`,
        );
      }
      if (subtopic.topicId !== topicId) {
        throw new BadRequestException(
          `Subtopic ${subtopicId} does not belong to topic ${topicId}`,
        );
      }
    }
  }

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

    // A new question carries no tags yet, so the effective triple is just
    // what the request supplies, with anything absent normalised to null.
    const subjectId = createQuestionDto.subjectId ?? null;
    const topicId = createQuestionDto.topicId ?? null;
    const subtopicId = createQuestionDto.subtopicId ?? null;

    await this.assertTaxonomy(subjectId, topicId, subtopicId);

    // Shuffle the answers array
    const shuffledAnswers = this.shuffleArray([...answers]);

    const question = this.questionRepository.create({
      ...otherFields,
      courseId,
      answers: shuffledAnswers,
      correctAnswer,
      subjectId,
      topicId,
      subtopicId,
      createdBy,
      isActive: otherFields.isActive ?? true,
      difficulty: otherFields.difficulty ?? 1,
      points: otherFields.points ?? 10,
    });

    return await this.questionRepository.save(question);
  }

  /**
   * Filters combine: passing courseId and subjectId returns the questions
   * matching both. The taxonomy filters match the column directly rather
   * than walking the hierarchy, which needs no walk anyway - a question
   * tagged to a subtopic carries its topic and subject too, so it is found
   * by any of the three.
   */
  async findAll(filters: FindQuestionsQueryDto = {}): Promise<Question[]> {
    const { courseId, subjectId, topicId, subtopicId } = filters;

    return await this.questionRepository.find({
      where: {
        isActive: true,
        ...(courseId ? { courseId } : {}),
        ...(subjectId ? { subjectId } : {}),
        ...(topicId ? { topicId } : {}),
        ...(subtopicId ? { subtopicId } : {}),
      },
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

    // Resolved against the stored row, not read straight off the request: a
    // PATCH moving only one of the three ids can still break the chain.
    await this.assertTaxonomy(
      this.resolveTag(updateQuestionDto.subjectId, question.subjectId),
      this.resolveTag(updateQuestionDto.topicId, question.topicId),
      this.resolveTag(updateQuestionDto.subtopicId, question.subtopicId),
    );

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
