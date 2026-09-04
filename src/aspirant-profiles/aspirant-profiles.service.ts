import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { AspirantProfile } from './entities/aspirant-profile.entity';
import { CreateAspirantProfileDto } from './dto/create-aspirant-profile.dto';
import { UpdateAspirantProfileDto } from './dto/update-aspirant-profile.dto';
import { DeleteAspirantProfileDto } from './dto/delete-aspirant-profile.dto';
import { User } from '../users/entities/user.entity';
import { Batch } from '../batches/entities/batch.entity';

@Injectable()
export class AspirantProfilesService implements OnModuleInit {
  constructor(
    @InjectRepository(AspirantProfile)
    private readonly aspirantProfileRepository: Repository<AspirantProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Batch)
    private readonly batchRepository: Repository<Batch>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * PSC ids come from a Postgres sequence rather than a count or MAX(), so a
   * number is drawn once and never reissued - a soft-deleted profile keeps
   * its id reserved.
   *
   * The project has no migration runner, so the sequence is created here
   * alongside the schema work `synchronize` already does at boot. IF NOT
   * EXISTS makes it a no-op on every boot after the first.
   */
  async onModuleInit() {
    await this.dataSource.query(
      'CREATE SEQUENCE IF NOT EXISTS psc_id_seq START WITH 100',
    );
  }

  /** Draws the next PSC id, e.g. PSC100, PSC101. */
  private async nextPscId(): Promise<string> {
    const rows: Array<{ nextval: string }> = await this.dataSource.query(
      "SELECT nextval('psc_id_seq') AS nextval",
    );
    return `PSC${rows[0].nextval}`;
  }

  /**
   * An aspirant may only be assigned to a batch that exists and is still
   * live. The FK covers hard deletes; a soft-deleted batch would otherwise
   * satisfy the constraint while being invisible everywhere else.
   */
  private async assertBatchExists(batchId: number) {
    const batch = await this.batchRepository.findOne({
      where: { id: batchId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException(`Batch with ID ${batchId} not found`);
    }
  }

  async create(
    createAspirantProfileDto: CreateAspirantProfileDto,
  ): Promise<AspirantProfile> {
    try {
      const { userId } = createAspirantProfileDto;

      const user = await this.userRepository.findOne({
        where: { id: userId, deletedAt: IsNull() },
      });
      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      if (createAspirantProfileDto.batchId) {
        await this.assertBatchExists(createAspirantProfileDto.batchId);
      }

      // userId is unique on the table, so a soft deleted row still blocks
      // inserting a new profile for the same user - revive that row instead.
      const existing = await this.aspirantProfileRepository.findOne({
        where: { userId },
        withDeleted: true,
      });

      if (existing && !existing.deletedAt) {
        throw new ConflictException(
          `Aspirant profile already exists for user ID ${userId}`,
        );
      }

      if (existing) {
        Object.assign(existing, createAspirantProfileDto, {
          deletedAt: null,
          deletedBy: null,
          updatedBy: createAspirantProfileDto.createdBy ?? null,
          // A revived profile keeps the id it was issued. Only a row that
          // predates this column, or one never issued an id, draws a new one.
          pscId: existing.pscId ?? (await this.nextPscId()),
        });
        return await this.aspirantProfileRepository.save(existing);
      }

      const profile = this.aspirantProfileRepository.create({
        ...createAspirantProfileDto,
        pscId: await this.nextPscId(),
      });
      return await this.aspirantProfileRepository.save(profile);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to create aspirant profile',
      );
    }
  }

  async findAll(): Promise<AspirantProfile[]> {
    try {
      return await this.aspirantProfileRepository.find({
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to retrieve aspirant profiles',
      );
    }
  }

  async findOne(id: number): Promise<AspirantProfile> {
    try {
      const profile = await this.aspirantProfileRepository.findOne({
        where: { id },
        relations: ['user'],
      });
      if (!profile) {
        throw new NotFoundException(`Aspirant profile with ID ${id} not found`);
      }
      return profile;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to fetch aspirant profile',
      );
    }
  }

  async findByUserId(userId: number): Promise<AspirantProfile> {
    try {
      const profile = await this.aspirantProfileRepository.findOne({
        where: { userId },
        relations: ['user'],
      });
      if (!profile) {
        throw new NotFoundException(
          `Aspirant profile for user ID ${userId} not found`,
        );
      }
      return profile;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to fetch aspirant profile',
      );
    }
  }

  async update(
    id: number,
    updateAspirantProfileDto: UpdateAspirantProfileDto,
  ): Promise<AspirantProfile> {
    try {
      const profile = await this.aspirantProfileRepository.findOne({
        where: { id },
      });
      if (!profile) {
        throw new NotFoundException(`Aspirant profile with ID ${id} not found`);
      }

      if (updateAspirantProfileDto.batchId) {
        await this.assertBatchExists(updateAspirantProfileDto.batchId);
      }

      Object.assign(profile, updateAspirantProfileDto);
      return await this.aspirantProfileRepository.save(profile);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to update aspirant profile',
      );
    }
  }

  async remove(
    id: number,
    deleteAspirantProfileDto: DeleteAspirantProfileDto,
  ): Promise<{ message: string }> {
    try {
      const profile = await this.aspirantProfileRepository.findOne({
        where: { id },
      });
      if (!profile) {
        throw new NotFoundException(`Aspirant profile with ID ${id} not found`);
      }

      profile.deletedBy = deleteAspirantProfileDto.deletedBy;
      await this.aspirantProfileRepository.save(profile);
      await this.aspirantProfileRepository.softDelete(id);

      return {
        message: `Aspirant profile with ID ${id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to delete aspirant profile',
      );
    }
  }
}
