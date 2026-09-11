import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AnswerLog } from '../answer-log/entities/answer-log.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { WeakSubjectDto } from './dto/weak-subject.dto';

/** Shape getRawMany hands back - Postgres returns the aggregates as text. */
interface WeakSubjectRow {
  subjectId: number;
  subjectName: string;
  attempted: string;
  correct: string;
}

@Injectable()
export class StudentAnalyticsService {
  private readonly logger = new Logger(StudentAnalyticsService.name);

  /**
   * Reads the answer log directly rather than going through UsersService:
   * users.service.ts is hand-merged and off limits to both developers, and
   * the rollup needs no user data beyond checking the student exists.
   */
  constructor(
    @InjectRepository(AnswerLog)
    private readonly answerLogRepository: Repository<AnswerLog>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * The subjects a student is weakest in, worst accuracy first.
   *
   * Counts practice and exam answers together: a subject you keep getting
   * wrong in practice is a weakness whether or not it was under exam
   * conditions.
   *
   * Deliberately has no date window. `answeredAt` is the insert time for
   * backfilled rows, not the original attempt, so "the last 30 days" would
   * silently mean "everything the backfill inserted" - see the note on the
   * column in AnswerLog. A windowed version has to join exams.completedAt
   * through exam_id, which is a Reports concern, not this panel's.
   */
  async weakSubjects(
    userId: number,
    limit: number,
    minAttempts: number,
  ): Promise<WeakSubjectDto[]> {
    await this.assertStudentExists(userId);

    try {
      // Aggregates are computed here and the ordering expression repeats
      // them, because Postgres will not accept a SELECT alias in ORDER BY
      // for a grouped query.
      const attempted = 'COUNT(*)';
      const correct = 'COUNT(*) FILTER (WHERE log.is_correct)';

      const rows = await this.answerLogRepository
        .createQueryBuilder('log')
        // Inner join, so an answer whose subject row is gone drops out -
        // subject_id deliberately carries no foreign key, so that can happen.
        .innerJoin(Subject, 'subject', 'subject.id = log.subject_id')
        .select('log.subject_id', 'subjectId')
        .addSelect('subject.name', 'subjectName')
        .addSelect(attempted, 'attempted')
        .addSelect(correct, 'correct')
        .where('log.user_id = :userId', { userId })
        // An untagged question still produces an answer; it just cannot be
        // rolled up by subject.
        .andWhere('log.subject_id IS NOT NULL')
        .groupBy('log.subject_id')
        .addGroupBy('subject.name')
        .having(`${attempted} >= :minAttempts`, { minAttempts })
        // Weakest first. Ties break towards the subject with more evidence
        // behind it, then by id so the order is stable between calls.
        .orderBy(`(${correct})::float / ${attempted}`, 'ASC')
        .addOrderBy(attempted, 'DESC')
        .addOrderBy('log.subject_id', 'ASC')
        .limit(limit)
        .getRawMany<WeakSubjectRow>();

      return rows.map((row) => {
        const attemptedCount = Number(row.attempted);
        const correctCount = Number(row.correct);
        return {
          subjectId: Number(row.subjectId),
          subjectName: row.subjectName,
          attempted: attemptedCount,
          correct: correctCount,
          incorrect: attemptedCount - correctCount,
          // Rounded here rather than in SQL so the percentage is derived
          // from the same two integers the response reports.
          accuracy:
            Math.round((correctCount / attemptedCount) * 1000) / 10,
        };
      });
    } catch (error) {
      this.logger.error(
        `Failed to roll up weak subjects for user ${userId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException('Failed to load weak subjects');
    }
  }

  /**
   * 404 for an unknown, soft-deleted or non-student account, matching
   * GET /users/:id and GET /users/:id/exams - an admin id reports 404 there
   * too, and this panel sits on the same screen.
   */
  private async assertStudentExists(userId: number): Promise<void> {
    const exists = await this.userRepository.exists({
      where: { id: userId, role: Role.User, deletedAt: IsNull() },
    });
    if (!exists) {
      throw new NotFoundException(`Student with ID ${userId} not found`);
    }
  }
}
