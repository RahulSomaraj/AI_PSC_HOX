import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { ExamStage } from './entities/exam-stage.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamSyllabus } from '../syllabus/entities/exam-syllabus.entity';
import { CreateExamStageDto } from './dto/create-exam-stage.dto';
import { UpdateExamStageDto } from './dto/update-exam-stage.dto';
import { ReorderExamStagesDto } from './dto/reorder-exam-stages.dto';

@Injectable()
export class ExamStagesService {
  constructor(
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
    @InjectRepository(ExamSyllabus)
    private readonly syllabusRepository: Repository<ExamSyllabus>,
  ) {}

  async create(
    createExamStageDto: CreateExamStageDto,
    actorId?: number,
  ): Promise<ExamStage> {
    try {
      await this.assertExamExists(createExamStageDto.examId);
      await this.assertNameIsFree(
        createExamStageDto.examId,
        createExamStageDto.name,
      );

      const stage = this.examStageRepository.create({
        ...createExamStageDto,
        stageOrder:
          createExamStageDto.stageOrder ??
          (await this.nextStageOrder(createExamStageDto.examId)),
        createdBy: actorId ?? null,
      });
      return await this.examStageRepository.save(stage);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create exam stage');
    }
  }

  async findAll(
    filters: {
      examId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<ExamStage[]> {
    try {
      const where: FindOptionsWhere<ExamStage> = {};
      if (filters.examId !== undefined) where.examId = filters.examId;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.examStageRepository.find({
        where,
        relations: ['exam'],
        order: { examId: 'ASC', stageOrder: 'ASC', name: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to retrieve exam stages');
    }
  }

  async findOne(id: number): Promise<ExamStage> {
    try {
      const stage = await this.examStageRepository.findOne({
        where: { id },
        relations: ['exam'],
      });
      if (!stage) {
        throw new NotFoundException(`Exam stage with ID ${id} not found`);
      }
      return stage;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch exam stage');
    }
  }

  async update(
    id: number,
    updateExamStageDto: UpdateExamStageDto,
    actorId?: number,
  ): Promise<ExamStage> {
    try {
      const stage = await this.findOne(id);

      if (updateExamStageDto.name && updateExamStageDto.name !== stage.name) {
        await this.assertNameIsFree(stage.examId, updateExamStageDto.name, id);
      }

      Object.assign(stage, updateExamStageDto, { updatedBy: actorId ?? null });
      return await this.examStageRepository.save(stage);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update exam stage');
    }
  }

  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<ExamStage> {
    return await this.update(id, { isActive }, actorId);
  }

  /**
   * Rewrites `stageOrder` for a whole exam in one transaction, so the list
   * is never observed half-reordered.
   */
  async reorder(
    reorderDto: ReorderExamStagesDto,
    actorId?: number,
  ): Promise<ExamStage[]> {
    try {
      await this.assertExamExists(reorderDto.examId);

      const ids = reorderDto.items.map((item) => item.id);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Duplicate stage IDs in the request');
      }

      const stages = await this.examStageRepository.find({
        where: { id: In(ids), examId: reorderDto.examId },
      });
      if (stages.length !== ids.length) {
        throw new BadRequestException(
          `All stages must belong to exam ${reorderDto.examId}`,
        );
      }

      await this.examStageRepository.manager.transaction(async (manager) => {
        for (const item of reorderDto.items) {
          await manager.update(ExamStage, item.id, {
            stageOrder: item.stageOrder,
            updatedBy: actorId ?? null,
          });
        }
      });

      return await this.findAll({ examId: reorderDto.examId });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to reorder exam stages');
    }
  }

  /** Soft delete, blocked while a syllabus is still attached to the stage. */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const stage = await this.findOne(id);

      const syllabusCount = await this.syllabusRepository.count({
        where: { examStageId: id },
      });
      if (syllabusCount > 0) {
        throw new ConflictException(
          `Exam stage with ID ${id} still has a syllabus. Delete the syllabus first.`,
        );
      }

      stage.deletedBy = actorId ?? null;
      await this.examStageRepository.save(stage);
      await this.examStageRepository.softDelete(id);

      return {
        message: `Exam stage with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete exam stage');
    }
  }

  private async assertExamExists(examId: number): Promise<void> {
    const exam = await this.examPostRepository.findOne({
      where: { id: examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }
  }

  private async assertNameIsFree(
    examId: number,
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<ExamStage> = { examId, name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.examStageRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Stage "${name}" already exists for exam ${examId}`,
      );
    }
  }

  /** Appends new stages after the ones already defined for the exam. */
  private async nextStageOrder(examId: number): Promise<number> {
    const last = await this.examStageRepository.findOne({
      where: { examId },
      order: { stageOrder: 'DESC' },
    });
    return last ? last.stageOrder + 1 : 1;
  }
}
