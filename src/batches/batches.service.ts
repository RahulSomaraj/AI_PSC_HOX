import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Batch, BatchShift } from './entities/batch.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateBatchDto } from './dto/create-batch.dto';
import { UpdateBatchDto } from './dto/update-batch.dto';

// Postgres unique_violation - the partial index on (name, shift).
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
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
      });
      return await this.batchRepository.save(batch);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A batch with this name already exists in this shift',
        );
      }
      throw new InternalServerErrorException('Failed to create batch');
    }
  }

  async findAll() {
    try {
      return await this.batchRepository.find({
        where: { deletedAt: IsNull() },
        order: { name: 'ASC', shift: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve batches');
    }
  }

  async findOne(id: number) {
    try {
      const batch = await this.batchRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!batch) {
        throw new NotFoundException('Batch not found');
      }
      return batch;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch batch');
    }
  }

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
      throw new InternalServerErrorException('Failed to update batch');
    }
  }

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
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete batch');
    }
  }
}
