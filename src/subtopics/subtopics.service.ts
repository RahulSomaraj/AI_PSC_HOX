import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Subtopic } from './entities/subtopic.entity';
import { Topic } from '../topics/entities/topic.entity';
import { CreateSubtopicDto } from './dto/create-subtopic.dto';
import { UpdateSubtopicDto } from './dto/update-subtopic.dto';

// Postgres unique_violation - the partial index on (topicId, name).
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class SubtopicsService {
  constructor(
    @InjectRepository(Subtopic)
    private readonly subtopicRepository: Repository<Subtopic>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
  ) {}

  /** A subtopic may only hang off a topic that exists and is still live. */
  private async assertTopicExists(topicId: number) {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!topic) {
      throw new NotFoundException('Topic not found');
    }
  }

  /**
   * Rejects a name already taken under the same parent. `excludeId` keeps an
   * update from colliding with the row it is updating.
   */
  private async assertNameFree(
    topicId: number,
    name: string,
    excludeId?: number,
  ) {
    const clash = await this.subtopicRepository.findOne({
      where: {
        topicId,
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'A subtopic with this name already exists in this topic',
      );
    }
  }

  async create(createSubtopicDto: CreateSubtopicDto, userId: number) {
    try {
      const name = createSubtopicDto.name.trim();

      await this.assertTopicExists(createSubtopicDto.topicId);
      await this.assertNameFree(createSubtopicDto.topicId, name);

      const subtopic = this.subtopicRepository.create({
        ...createSubtopicDto,
        name,
        createdBy: userId,
      });
      return await this.subtopicRepository.save(subtopic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A subtopic with this name already exists in this topic',
        );
      }
      throw new InternalServerErrorException('Failed to create subtopic');
    }
  }

  async findAll(topicId?: number) {
    try {
      return await this.subtopicRepository.find({
        where: {
          deletedAt: IsNull(),
          ...(topicId ? { topicId } : {}),
        },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve subtopics');
    }
  }

  async findOne(id: number) {
    try {
      const subtopic = await this.subtopicRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!subtopic) {
        throw new NotFoundException('Subtopic not found');
      }
      return subtopic;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch subtopic');
    }
  }

  async update(
    id: number,
    updateSubtopicDto: UpdateSubtopicDto,
    userId: number,
  ) {
    try {
      const subtopic = await this.findOne(id);

      // A request may change the parent, the name, both or neither, so both
      // sides of the uniqueness check are resolved before comparing.
      const topicId = updateSubtopicDto.topicId ?? subtopic.topicId;
      const name = updateSubtopicDto.name?.trim() ?? subtopic.name;

      if (updateSubtopicDto.topicId !== undefined) {
        await this.assertTopicExists(topicId);
      }

      if (topicId !== subtopic.topicId || name !== subtopic.name) {
        await this.assertNameFree(topicId, name, id);
      }

      Object.assign(subtopic, updateSubtopicDto, {
        topicId,
        name,
        updatedBy: userId,
      });
      return await this.subtopicRepository.save(subtopic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A subtopic with this name already exists in this topic',
        );
      }
      throw new InternalServerErrorException('Failed to update subtopic');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const subtopic = await this.findOne(id);

      await this.subtopicRepository.update(subtopic.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return { message: `Subtopic with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete subtopic');
    }
  }
}
