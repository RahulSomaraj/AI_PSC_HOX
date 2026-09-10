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
import { FindOptionsWhere, ILike, In, Not, Repository } from 'typeorm';
import { Subtopic } from './entities/subtopic.entity';
import { Topic } from '../topics/entities/topic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';
import { CreateSubtopicDto } from './dto/create-subtopic.dto';
import { UpdateSubtopicDto } from './dto/update-subtopic.dto';
import { ReorderDto } from '../common/dto/reorder.dto';
=======
import { IsNull, Not, Repository } from 'typeorm';
import { Subtopic } from './entities/subtopic.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Question } from '../questions/entities/question.entity';
import { CreateSubtopicDto } from './dto/create-subtopic.dto';
import { UpdateSubtopicDto } from './dto/update-subtopic.dto';

// Postgres unique_violation - the partial index on (topicId, name).
const UNIQUE_VIOLATION = '23505';
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1

@Injectable()
export class SubtopicsService {
  constructor(
    @InjectRepository(Subtopic)
    private readonly subtopicRepository: Repository<Subtopic>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
<<<<<<< HEAD
    @InjectRepository(ExamSyllabusItem)
    private readonly syllabusItemRepository: Repository<ExamSyllabusItem>,
  ) {}

  async create(
    createSubtopicDto: CreateSubtopicDto,
    actorId?: number,
  ): Promise<Subtopic> {
    try {
      await this.assertTopicExists(createSubtopicDto.topicId);
      await this.assertNameIsFree(
        createSubtopicDto.topicId,
        createSubtopicDto.name,
      );

      const subtopic = this.subtopicRepository.create({
        ...createSubtopicDto,
        createdBy: actorId ?? null,
=======
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      });
      return await this.subtopicRepository.save(subtopic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
<<<<<<< HEAD
=======
      // The check above loses a race; the index is the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A subtopic with this name already exists in this topic',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to create subtopic');
    }
  }

<<<<<<< HEAD
  async findAll(
    filters: {
      topicId?: number;
      subjectId?: number;
      isActive?: boolean;
      search?: string;
    } = {},
  ): Promise<Subtopic[]> {
    try {
      const where: FindOptionsWhere<Subtopic> = {};
      if (filters.topicId !== undefined) where.topicId = filters.topicId;
      if (filters.subjectId !== undefined) {
        where.topic = { subjectId: filters.subjectId };
      }
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.subtopicRepository.find({
        where,
        relations: ['topic'],
        order: { topicId: 'ASC', sortOrder: 'ASC', name: 'ASC' },
      });
    } catch {
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to retrieve subtopics');
    }
  }

<<<<<<< HEAD
  async findOne(id: number): Promise<Subtopic> {
    try {
      const subtopic = await this.subtopicRepository.findOne({
        where: { id },
        relations: ['topic'],
      });
      if (!subtopic) {
        throw new NotFoundException(`Subtopic with ID ${id} not found`);
=======
  async findOne(id: number) {
    try {
      const subtopic = await this.subtopicRepository.findOne({
        where: { id, deletedAt: IsNull() },
      });
      if (!subtopic) {
        throw new NotFoundException('Subtopic not found');
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
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
<<<<<<< HEAD
    actorId?: number,
  ): Promise<Subtopic> {
    try {
      const subtopic = await this.findOne(id);

      if (updateSubtopicDto.name && updateSubtopicDto.name !== subtopic.name) {
        await this.assertNameIsFree(
          subtopic.topicId,
          updateSubtopicDto.name,
          id,
        );
      }

      Object.assign(subtopic, updateSubtopicDto, {
        updatedBy: actorId ?? null,
=======
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
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      });
      return await this.subtopicRepository.save(subtopic);
    } catch (err) {
      if (err instanceof HttpException) throw err;
<<<<<<< HEAD
=======
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'A subtopic with this name already exists in this topic',
        );
      }
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
      throw new InternalServerErrorException('Failed to update subtopic');
    }
  }

<<<<<<< HEAD
  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<Subtopic> {
    return await this.update(id, { isActive }, actorId);
  }

  /**
   * Rewrites `sortOrder` for the subtopics of one topic in a single
   * transaction. The topic is taken from the rows themselves; a request
   * mixing subtopics of different topics is rejected.
   */
  async reorder(reorderDto: ReorderDto, actorId?: number): Promise<Subtopic[]> {
    try {
      const ids = reorderDto.items.map((item) => item.id);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Duplicate subtopic IDs in the request');
      }

      const subtopics = await this.subtopicRepository.find({
        where: { id: In(ids) },
      });
      if (subtopics.length !== ids.length) {
        throw new NotFoundException('One or more subtopics were not found');
      }

      const topicIds = new Set(subtopics.map((subtopic) => subtopic.topicId));
      if (topicIds.size > 1) {
        throw new BadRequestException(
          'All subtopics in a reorder request must belong to the same topic',
        );
      }

      await this.subtopicRepository.manager.transaction(async (manager) => {
        for (const item of reorderDto.items) {
          await manager.update(Subtopic, item.id, {
            sortOrder: item.sortOrder,
            updatedBy: actorId ?? null,
          });
        }
      });

      return await this.findAll({ topicId: subtopics[0].topicId });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to reorder subtopics');
    }
  }

  /** Soft delete, blocked while a syllabus still maps the subtopic. */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const subtopic = await this.findOne(id);

      const mappedCount = await this.syllabusItemRepository.count({
        where: { subtopicId: id },
      });
      if (mappedCount > 0) {
        throw new ConflictException(
          `Subtopic with ID ${id} is mapped in ${mappedCount} syllabus item(s). Remove those mappings first.`,
        );
      }

      subtopic.deletedBy = actorId ?? null;
      await this.subtopicRepository.save(subtopic);
      await this.subtopicRepository.softDelete(id);

      return {
        message: `Subtopic with ID ${id} has been successfully removed`,
      };
=======
  async remove(id: number, userId: number): Promise<{ message: string }> {
    try {
      const subtopic = await this.findOne(id);

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a subtopic out from under its questions would leave them
      // tagged to a row nothing can see, so it is refused here instead.
      //
      // isActive is not part of the count: questions have no deletedAt, and
      // a deactivated question still holds the tag.
      const questions = await this.questionRepository.count({
        where: { subtopicId: subtopic.id },
      });
      if (questions > 0) {
        throw new ConflictException(
          `Cannot delete this subtopic: ${questions} question${questions === 1 ? ' is' : 's are'} still tagged to it`,
        );
      }

      await this.subtopicRepository.update(subtopic.id, {
        deletedAt: new Date(),
        deletedBy: userId,
      });
      return { message: `Subtopic with ID ${id} has been successfully removed` };
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete subtopic');
    }
  }
<<<<<<< HEAD

  private async assertTopicExists(topicId: number): Promise<void> {
    const topic = await this.topicRepository.findOne({
      where: { id: topicId },
    });
    if (!topic) {
      throw new NotFoundException(`Topic with ID ${topicId} not found`);
    }
  }

  private async assertNameIsFree(
    topicId: number,
    name: string,
    ignoreId?: number,
  ): Promise<void> {
    const where: FindOptionsWhere<Subtopic> = { topicId, name };
    if (ignoreId !== undefined) where.id = Not(ignoreId);

    const existing = await this.subtopicRepository.findOne({ where });
    if (existing) {
      throw new ConflictException(
        `Subtopic "${name}" already exists under topic ${topicId}`,
      );
    }
  }
=======
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
}
