import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager, In, IsNull } from 'typeorm';
import * as argon2 from 'argon2';
import { Faculty } from './entities/faculty.entity';
import { User } from '../users/entities/user.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Question } from '../questions/entities/question.entity';
import { Content } from '../content/entities/content.entity';
import { ContentStatus } from '../content/content-type.enum';
import { UserSession } from '../auth/entities/user-session.entity';
import { PasswordResetToken } from '../auth/entities/password-reset-token.entity';
import { Role } from '../common/enums/role.enum';
import { FACULTY_ROLE_OPTIONS } from './faculty-role.enum';
import { CreateFacultyDto } from './dto/create-faculty.dto';
import { UpdateFacultyDto } from './dto/update-faculty.dto';
import { FindFacultyQueryDto } from './dto/find-faculty-query.dto';

@Injectable()
export class FacultyService {
  constructor(private readonly dataSource: DataSource) {}

  private query(manager: EntityManager) {
    return manager
      .getRepository(Faculty)
      .createQueryBuilder('faculty')
      .innerJoinAndSelect(
        'faculty.user',
        'user',
        'user.deletedAt IS NULL AND user.role = :accountRole',
        { accountRole: Role.Staff },
      )
      .leftJoinAndSelect(
        'faculty.subject',
        'subject',
        'subject.deletedAt IS NULL',
      )
      .leftJoinAndSelect('faculty.batches', 'batch', 'batch.deletedAt IS NULL')
      .where('faculty.deletedAt IS NULL');
  }

  async findAll(query: FindFacultyQueryDto) {
    const {
      page = 1,
      limit = 10,
      search,
      subjectId,
      batchId,
      role,
      isActive,
    } = query;
    const qb = this.query(this.dataSource.manager);
    if (subjectId !== undefined)
      qb.andWhere('subject.id = :subjectId', { subjectId });
    if (role !== undefined) qb.andWhere('faculty.role = :role', { role });
    if (isActive !== undefined)
      qb.andWhere('user.isActive = :isActive', { isActive });
    if (batchId !== undefined) {
      // Separate filter join preserves ALL assigned batches in the response.
      qb.innerJoin(
        'faculty.batches',
        'filterBatch',
        'filterBatch.id = :batchId AND filterBatch.deletedAt IS NULL',
        { batchId },
      );
    }
    if (search) {
      qb.leftJoin(
        'faculty.batches',
        'searchBatch',
        'searchBatch.deletedAt IS NULL',
      )
        .leftJoin(
          'searchBatch.exam',
          'searchExam',
          'searchExam.deletedAt IS NULL',
        )
        .andWhere(
          `(CONCAT(user.firstName, ' ', user.lastName) ILIKE :search
          OR user.email ILIKE :search OR subject.name ILIKE :search
          OR searchBatch.name ILIKE :search OR searchExam.name ILIKE :search)`,
          { search: `%${search.replace(/[\\%_]/g, '\\$&')}%` },
        );
    }
    const [records, total] = await qb
      .orderBy('faculty.createdAt', 'DESC')
      .addOrderBy('faculty.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return {
      items: await this.present(records, this.dataSource.manager),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * What one faculty member has authored.
   *
   * Both halves key off `faculty.userId`, not `faculty.id`: the audit
   * columns on `questions` and `content` record the *account* that wrote the
   * row, and a faculty record is a separate thing hanging off that account.
   *
   * Questions are hard-deleted (`DELETE /questions/:id`), so every row that
   * survives is a real contribution and `isActive` is the only split worth
   * drawing. Content is soft-deleted, so a deleted item drops out of the
   * count entirely - a contribution someone withdrew is not a contribution.
   */
  async contributions(id: number, manager = this.dataSource.manager) {
    // Through the same builder findOne() uses, so a soft-deleted faculty
    // member, or one whose account is no longer staff, 404s identically.
    const faculty = await this.query(manager)
      .andWhere('faculty.id = :id', { id })
      .getOne();
    if (!faculty) throw new NotFoundException('Faculty member not found');

    const authorId = faculty.userId;
    const questions = manager.getRepository(Question);
    const content = manager.getRepository(Content);

    const lastAuthoredIn = async (
      repository: typeof questions | typeof content,
      alias: string,
    ): Promise<Date | null> => {
      const row = await repository
        .createQueryBuilder(alias)
        .select(`MAX(${alias}.createdAt)`, 'lastAt')
        .where(`${alias}.createdBy = :authorId`, { authorId })
        .getRawOne<{ lastAt: Date | null }>();
      return row?.lastAt ?? null;
    };

    const [
      questionsTotal,
      questionsActive,
      contentTotal,
      contentPublished,
      lastQuestionAt,
      lastContentAt,
    ] = await Promise.all([
      questions.countBy({ createdBy: authorId }),
      questions.countBy({ createdBy: authorId, isActive: true }),
      content.countBy({ createdBy: authorId }),
      content.countBy({ createdBy: authorId, status: ContentStatus.Published }),
      lastAuthoredIn(questions, 'question'),
      lastAuthoredIn(content, 'content'),
    ]);

    const lastContributedAt =
      [lastQuestionAt, lastContentAt]
        .filter((date): date is Date => date != null)
        .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

    return {
      facultyId: faculty.id,
      userId: authorId,
      questions: { total: questionsTotal, active: questionsActive },
      content: { total: contentTotal, published: contentPublished },
      // An ISO timestamp rather than a date: the audit columns are
      // timestamptz, and rendering a day means choosing a timezone, which is
      // the client's decision and not one to bake in here.
      lastContributedAt: lastContributedAt
        ? lastContributedAt.toISOString()
        : null,
    };
  }

  async findOne(id: number, manager = this.dataSource.manager) {
    const record = await this.query(manager)
      .andWhere('faculty.id = :id', { id })
      .getOne();
    if (!record) throw new NotFoundException('Faculty member not found');
    return (await this.present([record], manager))[0];
  }

  async options() {
    const [subjects, batches] = await Promise.all([
      this.dataSource.getRepository(Subject).find({
        where: { deletedAt: IsNull() },
        select: { id: true, name: true },
        order: { name: 'ASC' },
      }),
      this.dataSource.getRepository(Batch).find({
        where: { deletedAt: IsNull() },
        select: { id: true, name: true },
        order: { name: 'ASC' },
      }),
    ]);
    return {
      subjects,
      batches,
      roles: FACULTY_ROLE_OPTIONS,
      statuses: [
        { value: true, label: 'Active' },
        { value: false, label: 'Inactive' },
      ],
    };
  }

  async create(dto: CreateFacultyDto, actorId: number) {
    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.validateAssignments(manager, dto.subjectId, dto.batchIds);
        const email = dto.email.trim().toLowerCase();
        const users = manager.getRepository(User);
        if (await users.existsBy({ email, deletedAt: IsNull() })) {
          throw new ConflictException(
            'An account with this email already exists',
          );
        }
        const user = await users.save(
          users.create({
            firstName: dto.firstName.trim(),
            lastName: dto.lastName.trim(),
            email,
            phone: dto.phone,
            photoURL: dto.photoURL ?? null,
            passwordHash: await argon2.hash(dto.password, {
              type: argon2.argon2id,
            }),
            role: Role.Staff,
            isActive: dto.isActive ?? true,
            createdBy: actorId,
          }),
        );
        const faculty = manager.getRepository(Faculty);
        const record = await faculty.save(
          faculty.create({
            userId: user.id,
            subjectId: dto.subjectId,
            role: dto.role,
            batches: (dto.batchIds ?? []).map((id) => ({ id })),
            createdBy: actorId,
          }),
        );
        return this.findOne(record.id, manager);
      });
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  async update(id: number, dto: UpdateFacultyDto, actorId: number) {
    if (!Object.keys(dto).length)
      throw new BadRequestException('Provide at least one field to update');
    try {
      return await this.dataSource.transaction(async (manager) => {
        const { record, user } = await this.lockRecord(manager, id);
        await this.validateAssignments(manager, dto.subjectId, dto.batchIds);
        if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
        if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
        if (dto.email !== undefined)
          user.email = dto.email.trim().toLowerCase();
        if (dto.phone !== undefined) user.phone = dto.phone;
        if (dto.photoURL !== undefined) user.photoURL = dto.photoURL;
        if (dto.isActive !== undefined) user.isActive = dto.isActive;
        user.updatedBy = actorId;
        await manager.getRepository(User).save(user);
        if (dto.subjectId !== undefined) record.subjectId = dto.subjectId;
        if (dto.role !== undefined) record.role = dto.role;
        if (dto.batchIds !== undefined)
          record.batches = dto.batchIds.map(
            (batchId) => ({ id: batchId }) as Batch,
          );
        record.updatedBy = actorId;
        await manager.getRepository(Faculty).save(record);
        if (dto.isActive === false) await this.revokeSessions(manager, user.id);
        return this.findOne(id, manager);
      });
    } catch (error) {
      this.rethrowWriteError(error);
    }
  }

  setStatus(id: number, isActive: boolean, actorId: number) {
    return this.update(id, { isActive }, actorId);
  }

  async remove(id: number, actorId: number) {
    return this.dataSource.transaction(async (manager) => {
      const { record, user } = await this.lockRecord(manager, id);
      const deletedAt = new Date();
      await manager.getRepository(Faculty).update(record.id, {
        deletedAt,
        deletedBy: actorId,
        updatedBy: actorId,
      });
      await manager.getRepository(User).update(user.id, {
        deletedAt,
        deletedBy: actorId,
        updatedBy: actorId,
        isActive: false,
      });
      await this.revokeSessions(manager, user.id);
      await manager
        .getRepository(PasswordResetToken)
        .update({ userId: user.id, isUsed: false }, { isUsed: true });
      return { message: 'Faculty member deleted successfully' };
    });
  }

  private async lockRecord(manager: EntityManager, id: number) {
    const record = await manager.getRepository(Faculty).findOne({
      where: { id, deletedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!record) throw new NotFoundException('Faculty member not found');
    const user = await manager.getRepository(User).findOne({
      where: { id: record.userId, role: Role.Staff, deletedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!user) throw new NotFoundException('Faculty member not found');
    return { record, user };
  }

  private async validateAssignments(
    manager: EntityManager,
    subjectId?: number,
    batchIds?: number[],
  ) {
    if (
      subjectId !== undefined &&
      !(await manager
        .getRepository(Subject)
        .existsBy({ id: subjectId, deletedAt: IsNull() }))
    ) {
      throw new NotFoundException('Subject not found');
    }
    if (batchIds?.length) {
      const count = await manager
        .getRepository(Batch)
        .countBy({ id: In(batchIds), deletedAt: IsNull() });
      if (count !== batchIds.length)
        throw new NotFoundException(
          'One or more assigned batches were not found',
        );
    }
  }

  private async revokeSessions(manager: EntityManager, userId: number) {
    await manager
      .getRepository(UserSession)
      .update({ user: { id: userId }, revoked: false }, { revoked: true });
  }

  private async present(records: Faculty[], manager: EntityManager) {
    if (!records.length) return [];
    // Login creates a session; refresh rotates it without changing createdAt.
    // Include expired/revoked sessions so logging out does not erase last login.
    const logins: { userId: number; lastLogin: Date | string }[] = await manager
      .getRepository(UserSession)
      .createQueryBuilder('session')
      .select('session.userId', 'userId')
      .addSelect('MAX(session.createdAt)', 'lastLogin')
      .where('session.userId IN (:...userIds)', {
        userIds: records.map((record) => record.userId),
      })
      .groupBy('session.userId')
      .getRawMany();
    const byUser = new Map(
      logins.map((login) => [Number(login.userId), login.lastLogin]),
    );
    return records.map((record) => ({
      id: record.id,
      userId: record.userId,
      firstName: record.user.firstName,
      lastName: record.user.lastName,
      name: `${record.user.firstName} ${record.user.lastName}`,
      email: record.user.email,
      phone: record.user.phone,
      photoURL: record.user.photoURL,
      subjectId: record.subjectId,
      subject: record.subject
        ? { id: record.subject.id, name: record.subject.name }
        : null,
      role: record.role,
      assignedBatches: (record.batches ?? [])
        .map((batch) => ({ id: batch.id, name: batch.name }))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id - b.id),
      isActive: record.user.isActive,
      lastLogin: byUser.get(record.userId) ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  private rethrowWriteError(error: unknown): never {
    if ((error as { code?: string })?.code === '23505') {
      throw new ConflictException('An account with this email already exists');
    }
    throw error;
  }
}
