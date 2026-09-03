import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { ExamPost } from './entities/exam-post.entity';
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { CreateExamPostDto } from './dto/create-exam-post.dto';
import { UpdateExamPostDto } from './dto/update-exam-post.dto';

@Injectable()
export class ExamPostsService {
  constructor(
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
    @InjectRepository(ExamLevel)
    private readonly examLevelRepository: Repository<ExamLevel>,
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
  ) {}

  async create(
    createExamPostDto: CreateExamPostDto,
    actorId?: number,
  ): Promise<ExamPost> {
    try {
      await this.assertLevelExists(createExamPostDto.examLevelId);
      await this.assertNameIsFree(
        createExamPostDto.examLevelId,
        createExamPostDto.name,
      );

      const exam = this.examPostRepository.create({
        ...createExamPostDto,
        createdBy: actorId ?? null,
      });
      return await this.examPostRepository.save(exam);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create exam');
    }
  }

  async findAll(
    filters: {
      examLevelId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<ExamPost[]> {
    try {
      const where: FindOptionsWhere<ExamPost> = {};
      if (filters.examLevelId !== undefined) {
        where.examLevelId = filters.examLevelId;
      }
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.examPostRepository.find({
        where,
        relations: ['examLevel'],
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to retrieve exams');
    }
  }

  async findOne(id: number): Promise<ExamPost> {
    try {
      const exam = await this.examPostRepository.findOne({
        where: { id },
        relations: ['examLevel'],
      });
      if (!exam) {
        throw new NotFoundException(`Exam with ID ${id} not found`);
      }
      return exam;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam');
    }
  }

  /** The exam together with its stages, ordered the way they are conducted. */
  async findOneWithStages(
    id: number,
  ): Promise<ExamPost & { stages: ExamStage[] }> {
    const exam = await this.findOne(id);
    const stages = await this.examStageRepository.find({
      where: { examId: id },
      order: { stageOrder: 'ASC', name: 'ASC' },
    });
    return Object.assign(exam, { stages });
  }

  async update(
    id: number,
    updateExamPostDto: UpdateExamPostDto,
    actorId?: number,
  ): Promise<ExamPost> {
    try {
      const exam = await this.findOne(id);

      const examLevelId = updateExamPostDto.examLevelId ?? exam.examLevelId;
      if (
        updateExamPostDto.examLevelId !== undefined &&
        updateExamPostDto.examLevelId !== exam.examLevelId
      ) {
        await this.assertLevelExists(examLevelId);
      }

      const name = updateExamPostDto.name ?? exam.name;
      if (name !== exam.name || examLevelId !== exam.examLevelId) {
        await this.assertNameIsFree(examLevelId, name, id);
      }

      Object.assign(exam, updateExamPostDto, { updatedBy: actorId ?? null });
      return await this.examPostRepository.save(exam);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update exam');
    }
  }

  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<ExamPost> {
    return await this.update(id, { isActive }, actorId);
  }

  /** Soft delete, blocked while the exam still has stages. */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const exam = await this.findOne(id);

      const stageCount = await this.examStageRepository.count({
        where: { examId: id },
      });
      if (stageCount > 0) {
        throw new ConflictException(
          `Exam with ID ${id} still has ${stageCount} stage(s). Delete them first.`,
        );
      }

      exam.deletedBy = actorId ?? null;
      await this.examPostRepository.save(exam);
      await this.examPostRepository.softDelete(id);

      return { message: `Exam with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam');
    }
  }

  private async assertLevelExists(examLevelId: number): Promise<void> {
    const level = await this.examLevelRepository.findOne({
      where: { id: examLevelId },
    });
    if (!level) {
      throw new NotFoundException(
        `Exam level with ID ${examLevelId} not found`,
      );
    }
  }

  private async assertNameIsFree(
    examLevelId: number,
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<ExamPost> = { examLevelId, name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.examPostRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Exam "${name}" already exists under exam level ${examLevelId}`,
      );
    }
  }
}
