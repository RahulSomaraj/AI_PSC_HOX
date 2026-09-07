import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ExamLevel } from './entities/exam-level.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { CreateExamLevelDto } from './dto/create-exam-level.dto';
import { UpdateExamLevelDto } from './dto/update-exam-level.dto';

// Postgres unique_violation - the partial index on (name).
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ExamLevelsService {
  constructor(
    @InjectRepository(ExamLevel)
    private readonly examLevelRepository: Repository<ExamLevel>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
  ) {}

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
      });
      return await this.examLevelRepository.save(examLevel);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam level with this name already exists',
        );
      }
      throw new InternalServerErrorException('Failed to create exam level');
    }
  }

  async findAll() {
    try {
      return await this.examLevelRepository.find({
        where: { deletedAt: IsNull() },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve exam levels');
    }
  }

  async findOne(id: number) {
    try {
      const examLevel = await this.examLevelRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!examLevel) {
        throw new NotFoundException('Exam level not found');
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
      });
      return await this.examLevelRepository.save(examLevel);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'An exam level with this name already exists',
        );
      }
      throw new InternalServerErrorException('Failed to update exam level');
    }
  }

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
      return {
        message: `Exam level with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam level');
    }
  }
}
