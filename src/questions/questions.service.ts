import {
  ConflictException,
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
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { AnswerLogService } from '../answer-log/answer-log.service';
import {
  BulkQuestionsDto,
  BulkQuestionsResponseDto,
} from './dto/bulk-questions.dto';
import { QuestionLanguage, QuestionStatus } from './question-fields.enum';

/**
 * A question as the Question Bank reads it. `type`, `year` and `examLevelId`
 * are always null - see CreateQuestionDto for why they are not stored.
 */
export type QuestionView = Question & {
  code: string;
  type: null;
  year: null;
  examLevelId: null;
};

export interface PaginatedQuestions {
  items: QuestionView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
    @InjectRepository(AnswerLog)
    private answerLogRepository: Repository<AnswerLog>,
    private answerLogService: AnswerLogService,
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
        throw new NotFoundException(`Subtopic with ID ${subtopicId} not found`);
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
  ): Promise<QuestionView> {
    const {
      courseId,
      answers,
      correctAnswer,
      // Accepted from the console, never stored - see CreateQuestionDto.
      type: _type,
      year: _year,
      examLevelId: _examLevelId,
      ...otherFields
    } = createQuestionDto;

    const status = createQuestionDto.status ?? QuestionStatus.Draft;
    this.assertAnswerFor(status, answers, correctAnswer);

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
      // Set explicitly: the column's database default is `published`, so
      // that live questions are not demoted when the column is added.
      status,
      language: otherFields.language ?? QuestionLanguage.English,
    });

    return this.present(await this.questionRepository.save(question));
  }

  /**
   * Filters combine: passing courseId and subjectId returns the questions
   * matching both. The taxonomy filters match the column directly rather
   * than walking the hierarchy, which needs no walk anyway - a question
   * tagged to a subtopic carries its topic and subject too, so it is found
   * by any of the three.
   *
   * Without `page` this returns every match as a plain array, exactly as it
   * always has: the Exam Builder loads the whole bank to pick from. With
   * `page`, it returns one page and the totals the table footer needs.
   */
  async findAll(
    filters: FindQuestionsQueryDto = {},
  ): Promise<QuestionView[] | PaginatedQuestions> {
    const { courseId, subjectId, topicId, subtopicId, language, search } =
      filters;

    const qb = this.questionRepository
      .createQueryBuilder('question')
      .leftJoinAndSelect('question.course', 'course')
      .leftJoinAndSelect('question.creator', 'creator')
      .leftJoinAndSelect('question.updater', 'updater')
      .where('question.isActive = :isActive', { isActive: true });

    if (courseId) qb.andWhere('question.courseId = :courseId', { courseId });
    if (subjectId) {
      qb.andWhere('question.subjectId = :subjectId', { subjectId });
    }
    if (topicId) qb.andWhere('question.topicId = :topicId', { topicId });
    if (subtopicId) {
      qb.andWhere('question.subtopicId = :subtopicId', { subtopicId });
    }
    if (language) qb.andWhere('question.language = :language', { language });

    if (search) {
      // A code like Q-012 names one question by id; anything else is text.
      const code = /^q-?0*(\d+)$/i.exec(search);
      if (code) {
        qb.andWhere('question.id = :codeId', { codeId: Number(code[1]) });
      } else {
        qb.andWhere('question.question ILIKE :search', {
          search: `%${search.replace(/[\\%_]/g, '\\$&')}%`,
        });
      }
    }

    qb.orderBy('question.createdAt', 'DESC').addOrderBy('question.id', 'DESC');

    if (filters.page === undefined) {
      return (await qb.getMany()).map((question) => this.present(question));
    }

    const page = filters.page;
    const limit = filters.limit ?? 10;
    const [records, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: records.map((question) => this.present(question)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /** GET /questions/:id - findOne(), in the shape the Question Bank reads. */
  async getOne(id: number): Promise<QuestionView> {
    return this.present(await this.findOne(id));
  }

  /**
   * A question as the Question Bank reads it: the entity, plus `code`, plus
   * the three fields the console types but the table does not hold.
   *
   * `code` is derived from the id - Q-001, Q-042, Q-1234 - so it is stable
   * for the life of the question and unique without a column to keep so.
   */
  present(question: Question): QuestionView {
    return Object.assign({}, question, {
      code: `Q-${String(question.id).padStart(3, '0')}`,
      type: null,
      year: null,
      examLevelId: null,
    });
  }

  /**
   * A published question must have a correct answer, and it must be one of
   * the answers. A draft may be saved before either is settled - the console
   * sends an empty correctAnswer until an option is marked - but if a draft
   * does name an answer, it still has to be one of the choices.
   */
  private assertAnswerFor(
    status: QuestionStatus,
    answers: string[],
    correctAnswer: string,
  ): void {
    const named = correctAnswer.trim() !== '';

    if (status === QuestionStatus.Published && !named) {
      throw new BadRequestException(
        'A published question needs a correct answer',
      );
    }
    if (named && !answers.includes(correctAnswer)) {
      throw new BadRequestException(
        'Correct answer must be one of the provided answer choices',
      );
    }
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
  ): Promise<QuestionView> {
    const question = await this.findOne(id);

    const {
      // Accepted from the console, never stored - see CreateQuestionDto.
      type: _type,
      year: _year,
      examLevelId: _examLevelId,
      ...changes
    } = updateQuestionDto;

    // Checked against the row as it will be, not the request alone. Sending
    // only `status: published` to a draft with no answer marked must fail,
    // though nothing in that body is wrong on its own.
    this.assertAnswerFor(
      changes.status ?? question.status,
      changes.answers ?? question.answers,
      changes.correctAnswer !== undefined
        ? changes.correctAnswer
        : question.correctAnswer,
    );

    // Shuffle the answers if they're being updated
    if (changes.answers) {
      changes.answers = this.shuffleArray([...changes.answers]);
    }

    // Resolved against the stored row, not read straight off the request: a
    // PATCH moving only one of the three ids can still break the chain.
    await this.assertTaxonomy(
      this.resolveTag(changes.subjectId, question.subjectId),
      this.resolveTag(changes.topicId, question.topicId),
      this.resolveTag(changes.subtopicId, question.subtopicId),
    );

    Object.assign(question, changes);
    question.updatedBy = updatedBy;

    return this.present(await this.questionRepository.save(question));
  }

  /**
   * Hard delete, refused once anyone has answered the question.
   *
   * answer_log.question_id is RESTRICT, so the delete would fail at the
   * constraint anyway - as an unhandled driver error, surfacing as a 500 on
   * what is a legitimate request with a legitimate answer. This turns it
   * into a 409 that says what is in the way.
   *
   * Cascading instead was the alternative, and it would erase the answer
   * history of every student who ever sat the question. Retiring a question
   * that has been answered is what softDelete (isActive = false) is for: it
   * leaves the history intact and takes the question out of circulation.
   */
  async remove(id: number): Promise<{ message: string }> {
    const question = await this.findOne(id);

    const answers = await this.answerLogRepository.count({
      where: { questionId: id },
    });
    if (answers > 0) {
      throw new ConflictException(
        `Cannot delete this question: ${answers} recorded answer${answers === 1 ? '' : 's'} reference${answers === 1 ? 's' : ''} it. Deactivate it instead.`,
      );
    }

    await this.questionRepository.remove(question);

    return { message: 'Question deleted successfully' };
  }

  async softDelete(id: number): Promise<{ message: string }> {
    const question = await this.findOne(id);

    question.isActive = false;
    await this.questionRepository.save(question);

    return { message: 'Question deactivated successfully' };
  }

  /**
   * A practice answer: one question, outside any attempt.
   *
   * `userId` is required because the answer is logged, and an answer with no
   * one attached to it is of no use to the per-student analytics. This method
   * previously took only the DTO - the controller now supplies the id from
   * the token.
   *
   * The write is awaited rather than fired and forgotten: nothing else
   * records a practice answer, so a dropped row here is gone for good, with
   * no equivalent of exams.answers to rebuild it from.
   */
  async answerQuestion(
    answerQuestionDto: AnswerQuestionDto,
    userId: number,
  ): Promise<QuizResultDto> {
    const { questionId, selectedAnswer, timeTakenSec } = answerQuestionDto;

    const question = await this.findOne(questionId);

    const isCorrect = selectedAnswer === question.correctAnswer;
    const points = isCorrect ? question.points : 0;

    await this.answerLogService.recordPracticeAnswer({
      userId,
      questionId,
      selectedAnswer,
      isCorrect,
      timeTakenSec: timeTakenSec ?? null,
    });

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
