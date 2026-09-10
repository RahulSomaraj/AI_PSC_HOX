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

export interface PaginatedBatches {
  items: Batch[];
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
  ): Promise<Batch> {
    try {
      await this.assertExamExists(createBatchDto.examId);
      await this.assertNameIsFree(createBatchDto.name);
      this.assertDateRange(createBatchDto.startDate, createBatchDto.endDate);

      const batch = this.batchRepository.create({
        ...createBatchDto,
        createdBy: actorId ?? null,
      });
      return await this.batchRepository.save(batch);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create batch');
    }
  }

  /**
   * The admin list is paginated - it is read straight into a table with a
   * rows-per-page control, so it returns the page plus the total the footer
   * needs rather than the whole table.
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
  ): Promise<PaginatedBatches> {
    try {
      const where: FindOptionsWhere<Batch> = {};
      if (filters.examId !== undefined) where.examId = filters.examId;
      if (filters.mode !== undefined) where.mode = filters.mode;
      if (filters.status !== undefined) where.status = filters.status;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      const page = filters.page ?? 1;
      const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

      const [items, total] = await this.batchRepository.findAndCount({
        where,
        relations: ['exam'],
        order: { startDate: 'ASC', id: 'ASC' },
        skip: (page - 1) * limit,
        take: limit,
      });

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch {
      throw new InternalServerErrorException('Failed to retrieve batches');
    }
  }

  async findOne(id: number): Promise<Batch> {
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

  async update(
    id: number,
    updateBatchDto: UpdateBatchDto,
    actorId?: number,
  ): Promise<Batch> {
    try {
      const batch = await this.findOne(id);

      if (updateBatchDto.examId !== undefined) {
        await this.assertExamExists(updateBatchDto.examId);
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

      Object.assign(batch, updateBatchDto, { updatedBy: actorId ?? null });
      return await this.batchRepository.save(batch);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update batch');
    }
  }

  async setStatus(
    id: number,
    status: BatchStatus,
    actorId?: number,
  ): Promise<Batch> {
    return await this.update(id, { status }, actorId);
  }

  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const batch = await this.findOne(id);

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
