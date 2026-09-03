import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { AspirantProfile } from './entities/aspirant-profile.entity';
import { CreateAspirantProfileDto } from './dto/create-aspirant-profile.dto';
import { UpdateAspirantProfileDto } from './dto/update-aspirant-profile.dto';
import { DeleteAspirantProfileDto } from './dto/delete-aspirant-profile.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class AspirantProfilesService {
  constructor(
    @InjectRepository(AspirantProfile)
    private readonly aspirantProfileRepository: Repository<AspirantProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

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
        });
        return await this.aspirantProfileRepository.save(existing);
      }

      const profile = this.aspirantProfileRepository.create(
        createAspirantProfileDto,
      );
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
