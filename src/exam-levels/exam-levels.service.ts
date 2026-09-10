import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
<<<<<<< HEAD
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
=======
import { IsNull, Not, Repository } from 'typeorm';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
import { ExamLevel } from './entities/exam-level.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { CreateExamLevelDto } from './dto/create-exam-level.dto';
import { UpdateExamLevelDto } from './dto/update-exam-level.dto';

<<<<<<< HEAD
=======
// Postgres unique_violation - the partial index on (name).
const UNIQUE_VIOLATION = '23505';

>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
@Injectable()
export class ExamLevelsService {
  constructor(
    @InjectRepository(ExamLevel)
    private readonly examLevelRepository: Repository<ExamLevel>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
  ) {}

<<<<<<< HEAD
  async create(
    createExamLevelDto: CreateExamLevelDto,
    actorId?: number,
  ): Promise<ExamLevel> {
    try {
      await this.assertNameIsFree(createExamLevelDto.name);

      const examLevel = this.examLevelRepository.create({
        ...createExamLevelDto,
        createdBy: actorId ?? null,
=======
  /**
   * Rejects a name already taken by a live level. `excludeId` keeps an
   * update from colliding with the row it is updating.
   */
  private async assertNameFree(name: string, excludeId?: number) {
    const clash = await this.examLevelRepository.findOne({
      where: {
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException('An exam level with this name already exists');
    }
  }

  async create(createExamLevelDto: CreateExamLevelDto, userId: number) {
    try {
      const name = createExamLevelDto.name.trim();

      await this.assertNameFree(name);

      const examLevel = this.examLevelRepository.create({
        ...createExamLevelDto,
        name,
        createdBy: userId,
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      });
      return await this.examLevelRepository.save(examLevel);
    } catch (err) {
      if (err instanceof HttpException) throw err;
<<<<<<< HEAD
=======
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam level with this name already exists',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to create exam level');
    }
  }

<<<<<<< HEAD
  async findAll(
    filters: {
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<ExamLevel[]> {
    try {
      const where: FindOptionsWhere<ExamLevel> = {};
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.examLevelRepository.find({
        where,
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch {
=======
  async findAll() {
    try {
      return await this.examLevelRepository.find({
        where: { deletedAt: IsNull() },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to retrieve exam levels');
    }
  }

<<<<<<< HEAD
  async findOne(id: number): Promise<ExamLevel> {
    try {
      const examLevel = await this.examLevelRepository.findOne({
        where: { id },
      });
      if (!examLevel) {
        throw new NotFoundException(`Exam level with ID ${id} not found`);
=======
  async findOne(id: number) {
    try {
      const examLevel = await this.examLevelRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!examLevel) {
        throw new NotFoundException('Exam level not found');
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      }
      return examLevel;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam level');
    }
  }

  async update(
    id: number,
    updateExamLevelDto: UpdateExamLevelDto,
<<<<<<< HEAD
    actorId?: number,
  ): Promise<ExamLevel> {
    try {
      const examLevel = await this.findOne(id);

      if (
        updateExamLevelDto.name &&
        updateExamLevelDto.name !== examLevel.name
      ) {
        await this.assertNameIsFree(updateExamLevelDto.name);
      }

      Object.assign(examLevel, updateExamLevelDto, {
        updatedBy: actorId ?? null,
=======
    userId: number,
  ) {
    try {
      const examLevel = await this.findOne(id);

      const name = updateExamLevelDto.name?.trim() ?? examLevel.name;

      if (name !== examLevel.name) {
        await this.assertNameFree(name, id);
      }

      Object.assign(examLevel, updateExamLevelDto, {
        name,
        updatedBy: userId,
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      });
      return await this.examLevelRepository.save(examLevel);
    } catch (err) {
      if (err instanceof HttpException) throw err;
<<<<<<< HEAD
=======
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam level with this name already exists',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to update exam level');
    }
  }

<<<<<<< HEAD
  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<ExamLevel> {
    return await this.update(id, { isActive }, actorId);
  }

  /**
   * Soft delete, and only when nothing hangs off the level - an exam without
   * its level would be unreachable from the hierarchy.
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const examLevel = await this.findOne(id);

      const examCount = await this.examPostRepository.count({
        where: { examLevelId: id },
      });
      if (examCount > 0) {
        throw new ConflictException(
          `Exam level with ID ${id} still has ${examCount} exam(s). Delete or move them first.`,
        );
      }

      examLevel.deletedBy = actorId ?? null;
      await this.examLevelRepository.save(examLevel);
      await this.examLevelRepository.softDelete(id);

=======
  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const examLevel = await this.findOne(id);

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a level out from under its posts would leave them pointing
      // at a row nothing can see, so it is refused here instead.
      const posts = await this.examPostRepository.count({
        where: { examLevelId: examLevel.id, deletedAt: IsNull() },
      });
      if (posts > 0) {
        throw new ConflictException(
          `Cannot delete this exam level: ${posts} exam post${posts === 1 ? ' is' : 's are'} still filed under it`,
        );
      }

      await this.examLevelRepository.update(examLevel.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      return {
        message: `Exam level with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam level');
    }
  }
<<<<<<< HEAD

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.examLevelRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Exam level "${name}" already exists`);
    }
  }
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
}
