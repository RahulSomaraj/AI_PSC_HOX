import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { ExamLevel } from './entities/exam-level.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { CreateExamLevelDto } from './dto/create-exam-level.dto';
import { UpdateExamLevelDto } from './dto/update-exam-level.dto';

@Injectable()
export class ExamLevelsService {
  constructor(
    @InjectRepository(ExamLevel)
    private readonly examLevelRepository: Repository<ExamLevel>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
  ) {}

  async create(
    createExamLevelDto: CreateExamLevelDto,
    actorId?: number,
  ): Promise<ExamLevel> {
    try {
      await this.assertNameIsFree(createExamLevelDto.name);

      const examLevel = this.examLevelRepository.create({
        ...createExamLevelDto,
        createdBy: actorId ?? null,
      });
      return await this.examLevelRepository.save(examLevel);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create exam level');
    }
  }

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
      throw new InternalServerErrorException('Failed to retrieve exam levels');
    }
  }

  async findOne(id: number): Promise<ExamLevel> {
    try {
      const examLevel = await this.examLevelRepository.findOne({
        where: { id },
      });
      if (!examLevel) {
        throw new NotFoundException(`Exam level with ID ${id} not found`);
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
      });
      return await this.examLevelRepository.save(examLevel);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update exam level');
    }
  }

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

      return {
        message: `Exam level with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam level');
    }
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.examLevelRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Exam level "${name}" already exists`);
    }
  }
}
