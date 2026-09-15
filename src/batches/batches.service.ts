import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Not, Repository } from 'typeorm';
import { Batch } from './entities/batch.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';
import { BatchMode } from '../common/enums/batch-mode.enum';
import { BatchStatus } from '../common/enums/batch-status.enum';

/** Default page size of the admin batch list, and the ceiling a caller may ask for. */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

/**
 * A batch as the console reads it.
 *
 * The entity plus the console's names for two things the table calls
 * something else: `targetExamId` is `exam_id`, and `isActive` is `status`
 * seen as a yes/no. `examId` stays on the object too, so nothing that already
 * reads it breaks.
 */
export type BatchView = Batch & {
  targetExamId: number;
  isActive: boolean;
};

export interface PaginatedBatches {
  data: BatchView[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
  ) {}

  async create(
    createBatchDto: CreateBatchDto,
    actorId?: number,
  ): Promise<BatchView> {
    try {
      await this.assertExamExists(createBatchDto.targetExamId);
      await this.assertNameIsFree(createBatchDto.name);
      this.assertDateRange(createBatchDto.startDate, createBatchDto.endDate);

      const batch = this.batchRepository.create({
        ...this.toColumns(createBatchDto),
        createdBy: actorId ?? null,
      });
      return this.present(await this.batchRepository.save(batch));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create batch');
    }
  }

  /**
   * Paging is opt-in.
   *
   * Without `page` this returns every match as a plain array: that is what
   * the console reads - four of its screens fetch `/batches` whole, for the
   * batch list and for batch pickers - and it filters and pages the list
   * itself. With `page`, one page plus the total a table footer needs.
   */
  async findAll(
    filters: {
      examId?: number;
      mode?: BatchMode;
      status?: BatchStatus;
      search?: string;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<BatchView[] | PaginatedBatches> {
    try {
      const where: FindOptionsWhere<Batch> = {};
      if (filters.examId !== undefined) where.examId = filters.examId;
      if (filters.mode !== undefined) where.mode = filters.mode;
      if (filters.status !== undefined) where.status = filters.status;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      const order = { startDate: 'ASC', id: 'ASC' } as const;

      if (filters.page === undefined) {
        const batches = await this.batchRepository.find({
          where,
          relations: ['exam'],
          order,
        });
        return batches.map((batch) => this.present(batch));
      }

      const page = filters.page;
      const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

      const [rows, total] = await this.batchRepository.findAndCount({
        where,
        relations: ['exam'],
        order,
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        data: rows.map((batch) => this.present(batch)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      throw new InternalServerErrorException('Failed to retrieve batches');
    }
  }

  async findOne(id: number): Promise<BatchView> {
    return this.present(await this.load(id));
  }

  async update(
    id: number,
    updateBatchDto: UpdateBatchDto,
    actorId?: number,
  ): Promise<BatchView> {
    try {
      const batch = await this.load(id);

      if (updateBatchDto.targetExamId !== undefined) {
        await this.assertExamExists(updateBatchDto.targetExamId);
      }
      if (updateBatchDto.name && updateBatchDto.name !== batch.name) {
        await this.assertNameIsFree(updateBatchDto.name, id);
      }

      // Either date may be omitted, so validate the range the batch will end
      // up with rather than only what was sent.
      this.assertDateRange(
        updateBatchDto.startDate ?? batch.startDate,
        updateBatchDto.endDate ?? batch.endDate,
      );

      Object.assign(batch, this.toColumns(updateBatchDto), {
        updatedBy: actorId ?? null,
      });
      return this.present(await this.batchRepository.save(batch));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update batch');
    }
  }

  async setStatus(
    id: number,
    status: BatchStatus,
    actorId?: number,
  ): Promise<BatchView> {
    return await this.update(id, { status }, actorId);
  }

  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const batch = await this.load(id);

      batch.deletedBy = actorId ?? null;
      await this.batchRepository.save(batch);
      await this.batchRepository.softDelete(id);

      return {
        message: `Batch with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete batch');
    }
  }

  /** The entity itself, for the write paths that save it back. */
  private async load(id: number): Promise<Batch> {
    try {
      const batch = await this.batchRepository.findOne({
        where: { id },
        relations: ['exam'],
      });
      if (!batch) {
        throw new NotFoundException(`Batch with ID ${id} not found`);
      }
      return batch;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch batch');
    }
  }

  /**
   * A request body in column names.
   *
   * `targetExamId` becomes `examId`. `shift` is dropped on the floor - the
   * table has no such column, and the console only sends it out of habit
   * (see CreateBatchDto.shift).
   */
  private toColumns(dto: Partial<CreateBatchDto>): Partial<Batch> {
    const { targetExamId, shift: _shift, ...rest } = dto;
    return {
      ...rest,
      ...(targetExamId !== undefined ? { examId: targetExamId } : {}),
    };
  }

  private present(batch: Batch): BatchView {
    return Object.assign({}, batch, {
      targetExamId: batch.examId,
      // Only an admin-inactive batch is off. `ongoing` and `upcoming` are
      // lifecycle states of a batch that is very much live.
      isActive: batch.status !== BatchStatus.Inactive,
    });
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
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<Batch> = { name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.batchRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(`Batch "${name}" already exists`);
    }
  }

  private assertDateRange(startDate: string, endDate: string): void {
    if (new Date(endDate) < new Date(startDate)) {
      throw new BadRequestException('endDate cannot be before startDate');
    }
  }
}
