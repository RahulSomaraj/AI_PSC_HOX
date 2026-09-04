import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Topic } from './entities/topic.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

// Postgres unique_violation - the partial index on (subjectId, name).
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
  ) {}

  /** A topic may only hang off a subject that exists and is still live. */
  private async assertSubjectExists(subjectId: number) {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
  }

  /**
   * Rejects a name already taken under the same parent. `excludeId` keeps an
   * update from colliding with the row it is updating.
   */
  private async assertNameFree(
    subjectId: number,
    name: string,
    excludeId?: number,
  ) {
    const clash = await this.topicRepository.findOne({
      where: {
        subjectId,
        name,
        deletedAt: IsNull(),
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'A topic with this name already exists in this subject',
      );
    }
  }

  async create(createTopicDto: CreateTopicDto, userId: number) {
    try {
      const name = createTopicDto.name.trim();

      await this.assertSubjectExists(createTopicDto.subjectId);
      await this.assertNameFree(createTopicDto.subjectId, name);

      const topic = this.topicRepository.create({
        ...createTopicDto,
        name,
        createdBy: userId,
      });
      return await this.topicRepository.save(topic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A topic with this name already exists in this subject',
        );
      }
      throw new InternalServerErrorException('Failed to create topic');
    }
  }

  async findAll(subjectId?: number) {
    try {
      return await this.topicRepository.find({
        where: {
          deletedAt: IsNull(),
          ...(subjectId ? { subjectId } : {}),
        },
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException('Failed to retrieve topics');
    }
  }

  async findOne(id: number) {
    try {
      const topic = await this.topicRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!topic) {
        throw new NotFoundException('Topic not found');
      }
      return topic;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch topic');
    }
  }

  async update(id: number, updateTopicDto: UpdateTopicDto, userId: number) {
    try {
      const topic = await this.findOne(id);

      // A request may change the parent, the name, both or neither, so both
      // sides of the uniqueness check are resolved before comparing.
      const subjectId = updateTopicDto.subjectId ?? topic.subjectId;
      const name = updateTopicDto.name?.trim() ?? topic.name;

      if (updateTopicDto.subjectId !== undefined) {
        await this.assertSubjectExists(subjectId);
      }

      if (subjectId !== topic.subjectId || name !== topic.name) {
        await this.assertNameFree(subjectId, name, id);
      }

      Object.assign(topic, updateTopicDto, {
        subjectId,
        name,
        updatedBy: userId,
      });
      return await this.topicRepository.save(topic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A topic with this name already exists in this subject',
        );
      }
      throw new InternalServerErrorException('Failed to update topic');
    }
  }

  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const topic = await this.findOne(id);

      await this.topicRepository.update(topic.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return { message: `Topic with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete topic');
    }
  }
}
