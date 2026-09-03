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
import { Topic } from './entities/topic.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { ReorderDto } from '../common/dto/reorder.dto';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Subtopic)
    private readonly subtopicRepository: Repository<Subtopic>,
    @InjectRepository(ExamSyllabusItem)
    private readonly syllabusItemRepository: Repository<ExamSyllabusItem>,
  ) {}

  async create(
    createTopicDto: CreateTopicDto,
    actorId?: number,
  ): Promise<Topic> {
    try {
      await this.assertSubjectExists(createTopicDto.subjectId);
      await this.assertNameIsFree(
        createTopicDto.subjectId,
        createTopicDto.name,
      );

      const topic = this.topicRepository.create({
        ...createTopicDto,
        createdBy: actorId ?? null,
      });
      return await this.topicRepository.save(topic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create topic');
    }
  }

  async findAll(
    filters: { subjectId?: number; isActive?: boolean; search?: string } = {},
  ): Promise<Topic[]> {
    try {
      const where: FindOptionsWhere<Topic> = {};
      if (filters.subjectId !== undefined) where.subjectId = filters.subjectId;
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.topicRepository.find({
        where,
        relations: ['subject'],
        order: { subjectId: 'ASC', sortOrder: 'ASC', name: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to retrieve topics');
    }
  }

  async findOne(id: number): Promise<Topic> {
    try {
      const topic = await this.topicRepository.findOne({
        where: { id },
        relations: ['subject'],
      });
      if (!topic) {
        throw new NotFoundException(`Topic with ID ${id} not found`);
      }
      return topic;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch topic');
    }
  }

  async update(
    id: number,
    updateTopicDto: UpdateTopicDto,
    actorId?: number,
  ): Promise<Topic> {
    try {
      const topic = await this.findOne(id);

      if (updateTopicDto.name && updateTopicDto.name !== topic.name) {
        await this.assertNameIsFree(topic.subjectId, updateTopicDto.name, id);
      }

      Object.assign(topic, updateTopicDto, { updatedBy: actorId ?? null });
      return await this.topicRepository.save(topic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update topic');
    }
  }

  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<Topic> {
    return await this.update(id, { isActive }, actorId);
  }

  /**
   * Rewrites `sortOrder` for the topics of one subject in a single
   * transaction. The subject is taken from the rows themselves; a request
   * mixing topics of different subjects is rejected.
   */
  async reorder(reorderDto: ReorderDto, actorId?: number): Promise<Topic[]> {
    try {
      const ids = reorderDto.items.map((item) => item.id);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Duplicate topic IDs in the request');
      }

      const topics = await this.topicRepository.find({
        where: { id: In(ids) },
      });
      if (topics.length !== ids.length) {
        throw new NotFoundException('One or more topics were not found');
      }

      const subjectIds = new Set(topics.map((topic) => topic.subjectId));
      if (subjectIds.size > 1) {
        throw new BadRequestException(
          'All topics in a reorder request must belong to the same subject',
        );
      }

      await this.topicRepository.manager.transaction(async (manager) => {
        for (const item of reorderDto.items) {
          await manager.update(Topic, item.id, {
            sortOrder: item.sortOrder,
            updatedBy: actorId ?? null,
          });
        }
      });

      return await this.findAll({ subjectId: topics[0].subjectId });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to reorder topics');
    }
  }

  /**
   * Soft delete, blocked while subtopics hang off the topic or a syllabus
   * still maps it.
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const topic = await this.findOne(id);

      const subtopicCount = await this.subtopicRepository.count({
        where: { topicId: id },
      });
      if (subtopicCount > 0) {
        throw new ConflictException(
          `Topic with ID ${id} still has ${subtopicCount} subtopic(s). Delete them first.`,
        );
      }

      const mappedCount = await this.syllabusItemRepository.count({
        where: { topicId: id },
      });
      if (mappedCount > 0) {
        throw new ConflictException(
          `Topic with ID ${id} is mapped in ${mappedCount} syllabus item(s). Remove those mappings first.`,
        );
      }

      topic.deletedBy = actorId ?? null;
      await this.topicRepository.save(topic);
      await this.topicRepository.softDelete(id);

      return { message: `Topic with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete topic');
    }
  }

  private async assertSubjectExists(subjectId: number): Promise<void> {
    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId },
    });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }
  }

  private async assertNameIsFree(
    subjectId: number,
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<Topic> = { subjectId, name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.topicRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Topic "${name}" already exists under subject ${subjectId}`,
      );
    }
  }
}
