import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Exam } from './entities/exam.entity';
import { CreateExamDto } from './dto/create-exam.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { ExamResponseDto, ExamResultDto } from './dto/exam-response.dto';
import { QuestionsService } from '../questions/questions.service';
import { Course } from '../course/entities/course.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { AnswerLogService } from '../answer-log/answer-log.service';

@Injectable()
export class ExamService {
  constructor(
    @InjectRepository(Exam)
    private examRepository: Repository<Exam>,
    @InjectRepository(Course)
    private courseRepository: Repository<Course>,
    @InjectRepository(ExamStage)
    private examStageRepository: Repository<ExamStage>,
    private questionsService: QuestionsService,
    private answerLogService: AnswerLogService,
  ) {}

  async create(
    createExamDto: CreateExamDto,
    userId: number,
  ): Promise<ExamResponseDto> {
    // Validate course exists
    const course = await this.courseRepository.findOne({
      where: { id: createExamDto.courseId, deletedAt: IsNull() },
    });

    if (!course) {
      throw new NotFoundException(
        `Course with ID ${createExamDto.courseId} not found`,
      );
    }

    // Validated rather than trusted: the column is RESTRICT, so a bad id
    // would otherwise surface as a 500 from the FK instead of a 404.
    // A soft-deleted stage is treated as absent, matching the course check.
    if (createExamDto.examStageId !== undefined) {
      const stageExists = await this.examStageRepository.exists({
        where: { id: createExamDto.examStageId, deletedAt: IsNull() },
      });
      if (!stageExists) {
        throw new NotFoundException(
          `Exam stage with ID ${createExamDto.examStageId} not found`,
        );
      }
    }

    // Get random questions (max 30)
    const maxQuestions = Math.min(createExamDto.maxQuestions || 30, 30);
    const randomQuestions = await this.questionsService.getRandomQuestions(
      createExamDto.courseId,
      maxQuestions,
    );

    if (randomQuestions.length === 0) {
      throw new BadRequestException(
        'No questions available for this course. Please add questions first.',
      );
    }

    // Extract question IDs
    const questionIds = randomQuestions.map((q) => q.id);

    // Create exam
    const exam = this.examRepository.create({
      userId,
      courseId: createExamDto.courseId,
      // Null when the caller named no stage, which is every attempt made
      // before the field existed.
      examStageId: createExamDto.examStageId ?? null,
      // Stored only when the caller actually named the attempt. A title that
      // trims to nothing is normalised to null so it takes the same fallback
      // path as an omitted one, rather than rendering as a blank label.
      //
      // The course name is deliberately not written here: it would be a copy
      // frozen at creation time, going stale the moment the course is
      // renamed, and it would erase the difference between an attempt nobody
      // named and one named after its course on purpose. The fallback is
      // applied when the response is built instead.
      title: createExamDto.title?.trim() || null,
      questionIds,
      maxQuestions: randomQuestions.length,
      status: 'pending',
      durationMinutes: createExamDto.durationMinutes || null,
    });

    const savedExam = await this.examRepository.save(exam);

    // Format questions for response (without correct answers)
    const questions = randomQuestions.map((q) => ({
      id: q.id,
      question: q.question,
      choices: q.answers, // Already shuffled
      points: q.points,
      difficulty: q.difficulty,
    }));

    return {
      examId: savedExam.id,
      courseId: savedExam.courseId,
      courseName: course.courseName,
      title: savedExam.title ?? course.courseName,
      status: savedExam.status,
      maxQuestions: savedExam.maxQuestions,
      totalQuestions: savedExam.maxQuestions,
      startedAt: savedExam.startedAt,
      completedAt: savedExam.completedAt,
      durationMinutes: savedExam.durationMinutes,
      questions,
    };
  }

  async start(examId: number, userId: number): Promise<ExamResponseDto> {
    const exam = await this.examRepository.findOne({
      where: { id: examId, userId },
      relations: ['course'],
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    if (exam.status !== 'pending') {
      throw new BadRequestException(
        `Exam cannot be started. Current status: ${exam.status}`,
      );
    }

    // Start the exam
    exam.status = 'in_progress';
    exam.startedAt = new Date();
    await this.examRepository.save(exam);

    // Get questions
    const questions = await this.questionsService.getBulkQuestions({
      questionIds: exam.questionIds,
    });

    // Format questions for response
    const formattedQuestions = questions.questions.map((q) => ({
      id: q.id,
      question: q.questionText,
      choices: q.choices,
      points: q.points,
      difficulty: q.difficulty,
    }));

    return {
      examId: exam.id,
      courseId: exam.courseId,
      courseName: exam.course?.courseName || 'Unknown',
      title: exam.title ?? exam.course?.courseName ?? 'Unknown',
      status: exam.status,
      maxQuestions: exam.maxQuestions,
      totalQuestions: exam.maxQuestions,
      startedAt: exam.startedAt,
      completedAt: exam.completedAt,
      durationMinutes: exam.durationMinutes,
      questions: formattedQuestions,
      timeRemaining: exam.durationMinutes
        ? exam.durationMinutes * 60
        : undefined,
    };
  }

  async submit(
    submitExamDto: SubmitExamDto,
    userId: number,
  ): Promise<ExamResultDto> {
    const exam = await this.examRepository.findOne({
      where: { id: submitExamDto.examId, userId },
      relations: ['course'],
    });

    if (!exam) {
      throw new NotFoundException(
        `Exam with ID ${submitExamDto.examId} not found`,
      );
    }

    if (exam.status !== 'in_progress') {
      throw new BadRequestException(
        `Exam cannot be submitted. Current status: ${exam.status}`,
      );
    }

    // Validate answers object exists
    if (!submitExamDto.answers || typeof submitExamDto.answers !== 'object') {
      throw new BadRequestException(
        'Answers object is required and must be an object',
      );
    }

    // Get questions with correct answers
    const questionsData = await this.questionsService.getBulkQuestions({
      questionIds: exam.questionIds,
    });

    // Calculate score
    let score = 0;
    let correctAnswers = 0;
    let wrongAnswers = 0;
    const totalPossibleScore = questionsData.questions.reduce(
      (sum, q) => sum + q.points,
      0,
    );

    const questionResults = questionsData.questions.map((q) => {
      // Handle both string and number keys in answers object
      const selectedAnswer =
        submitExamDto.answers[q.id] ||
        submitExamDto.answers[String(q.id)] ||
        '';
      const isCorrect = selectedAnswer === q.correctAnswer;
      const points = isCorrect ? q.points : 0;

      if (isCorrect) {
        score += points;
        correctAnswers++;
      } else {
        wrongAnswers++;
      }

      return {
        questionId: q.id,
        question: q.questionText,
        selectedAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        points,
        explanation: q.explanation,
      };
    });

    // Update exam
    exam.status = 'completed';
    exam.completedAt = new Date();
    exam.answers = submitExamDto.answers;
    exam.score = score;
    exam.totalPossibleScore = totalPossibleScore;

    // The completed exam and its answer rows commit together. An attempt
    // that is marked completed without its per-question rows would be
    // invisible to Weak Subjects and to the results breakdown, with nothing
    // to indicate anything was lost - so if the log cannot be written, the
    // submission fails and the student can resubmit. The rows are
    // orIgnore'd, so that retry is clean.
    await this.examRepository.manager.transaction(async (manager) => {
      await manager.save(exam);

      await this.answerLogService.recordExamAnswers(
        {
          userId,
          examId: exam.id,
          answers: questionResults.map((result) => ({
            questionId: result.questionId,
            selectedAnswer: result.selectedAnswer,
            isCorrect: result.isCorrect,
            // Sent per question id by clients that measure it; absent until
            // the frontend does, and null rather than 0 so "not measured" is
            // distinguishable from "answered instantly".
            timeTakenSec:
              submitExamDto.timings?.[result.questionId] ??
              submitExamDto.timings?.[String(result.questionId)] ??
              null,
          })),
        },
        manager,
      );
    });

    const percentage = totalPossibleScore > 0 
      ? Math.round((score / totalPossibleScore) * 100 * 100) / 100 
      : 0;

    return {
      examId: exam.id,
      courseId: exam.courseId,
      courseName: exam.course?.courseName || 'Unknown',
      title: exam.title ?? exam.course?.courseName ?? 'Unknown',
      status: exam.status,
      score,
      totalPossibleScore,
      percentage,
      totalQuestions: exam.maxQuestions,
      correctAnswers,
      wrongAnswers,
      questions: questionResults,
      startedAt: exam.startedAt!,
      completedAt: exam.completedAt!,
    };
  }

  async findOne(id: number, userId: number): Promise<ExamResponseDto> {
    const exam = await this.examRepository.findOne({
      where: { id, userId },
      relations: ['course'],
    });

    if (!exam) {
      throw new NotFoundException(`Exam with ID ${id} not found`);
    }

    // Get questions
    const questionsData = await this.questionsService.getBulkQuestions({
      questionIds: exam.questionIds,
    });

    const formattedQuestions = questionsData.questions.map((q) => ({
      id: q.id,
      question: q.questionText,
      choices: q.choices,
      points: q.points,
      difficulty: q.difficulty,
    }));

    // Calculate time remaining if in progress
    let timeRemaining: number | undefined;
    if (
      exam.status === 'in_progress' &&
      exam.startedAt &&
      exam.durationMinutes
    ) {
      const elapsedSeconds =
        (new Date().getTime() - exam.startedAt.getTime()) / 1000;
      const totalSeconds = exam.durationMinutes * 60;
      timeRemaining = Math.max(0, totalSeconds - elapsedSeconds);
    }

    return {
      examId: exam.id,
      courseId: exam.courseId,
      courseName: exam.course?.courseName || 'Unknown',
      title: exam.title ?? exam.course?.courseName ?? 'Unknown',
      status: exam.status,
      maxQuestions: exam.maxQuestions,
      totalQuestions: exam.maxQuestions,
      startedAt: exam.startedAt,
      completedAt: exam.completedAt,
      durationMinutes: exam.durationMinutes,
      questions: formattedQuestions,
      timeRemaining,
    };
  }

  async findByUser(userId: number): Promise<Exam[]> {
    return await this.examRepository.find({
      where: { userId },
      relations: ['course'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByCourse(courseId: number): Promise<Exam[]> {
    return await this.examRepository.find({
      where: { courseId },
      relations: ['user', 'course'],
      order: { createdAt: 'DESC' },
    });
  }
}

