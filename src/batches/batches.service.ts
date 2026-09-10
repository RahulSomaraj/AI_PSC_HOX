import {
<<<<<<< HEAD
  BadRequestException,
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
<<<<<<< HEAD
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
=======
import { IsNull, Not, Repository } from 'typeorm';
import { Batch, BatchShift } from './entities/batch.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

// Postgres unique_violation - the partial index on (name, shift).
const UNIQUE_VIOLATION = '23505';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
<<<<<<< HEAD
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
=======
    @InjectRepository(AspirantProfile)
    private readonly aspirantProfileRepository: Repository<AspirantProfile>,
  ) {}

  /**
   * Rejects a name already taken in the same shift. `excludeId` keeps an
   * update from colliding with the row it is updating.
   */
  private async assertNameFree(
    name: string,
    shift: BatchShift,
    excludeId?: number,
  ) {
    const clash = await this.batchRepository.findOne({
      where: {
        name,
        shift,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'A batch with this name already exists in this shift',
      );
    }
  }

  async create(createBatchDto: CreateBatchDto, userId: number) {
    try {
      const name = createBatchDto.name.trim();

      await this.assertNameFree(name, createBatchDto.shift);

      const batch = this.batchRepository.create({
        ...createBatchDto,
        name,
        createdBy: userId,
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      });
      return await this.batchRepository.save(batch);
    } catch (err) {
      if (err instanceof HttpException) throw err;
<<<<<<< HEAD
=======
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A batch with this name already exists in this shift',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to create batch');
    }
  }

<<<<<<< HEAD
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
=======
  async findAll() {
    try {
      return await this.batchRepository.find({
        where: { deletedAt: IsNull() },
        order: { name: 'ASC', shift: 'ASC' },
      });
    } catch (err) {
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to retrieve batches');
    }
  }

<<<<<<< HEAD
  async findOne(id: number): Promise<Batch> {
    try {
      const batch = await this.batchRepository.findOne({
        where: { id },
        relations: ['exam'],
      });
      if (!batch) {
        throw new NotFoundException(`Batch with ID ${id} not found`);
=======
  async findOne(id: number) {
    try {
      const batch = await this.batchRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!batch) {
        throw new NotFoundException('Batch not found');
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      }
      return batch;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch batch');
    }
  }

<<<<<<< HEAD
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
=======
  async update(id: number, updateBatchDto: UpdateBatchDto, userId: number) {
    try {
      const batch = await this.findOne(id);

      // Both halves of the unique key are editable, so each side is resolved
      // before comparing: a request may move the name, the shift, or both.
      const name = updateBatchDto.name?.trim() ?? batch.name;
      const shift = updateBatchDto.shift ?? batch.shift;

      if (name !== batch.name || shift !== batch.shift) {
        await this.assertNameFree(name, shift, id);
      }

      Object.assign(batch, updateBatchDto, {
        name,
        shift,
        updatedBy: userId,
      });
      return await this.batchRepository.save(batch);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A batch with this name already exists in this shift',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to update batch');
    }
  }

<<<<<<< HEAD
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
=======
  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const batch = await this.findOne(id);

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a batch out from under its aspirants would leave them
      // pointing at a row nothing can see, so it is refused here instead.
      const assigned = await this.aspirantProfileRepository.count({
        where: { batchId: batch.id, deletedAt: IsNull() },
      });
      if (assigned > 0) {
        throw new ConflictException(
          `Cannot delete this batch: ${assigned} aspirant${assigned === 1 ? ' is' : 's are'} still assigned to it`,
        );
      }

      await this.batchRepository.update(batch.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return { message: `Batch with ID ${id} has been successfully removed` };
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete batch');
    }
  }
<<<<<<< HEAD

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
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
}
