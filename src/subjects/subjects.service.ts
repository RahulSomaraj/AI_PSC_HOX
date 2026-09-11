import {
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Subject } from './entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { ExamSyllabusItem } from '../syllabus/entities/exam-syllabus-item.entity';
import { Question } from '../questions/entities/question.entity';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';

/** Shape returned by SubjectsService.getHierarchy(). */
export interface SubjectHierarchyNode {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  topics: {
    id: number;
    name: string;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    subtopics: {
      id: number;
      name: string;
      description: string | null;
      sortOrder: number;
      isActive: boolean;
    }[];
  }[];
}

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Subtopic)
    private readonly subtopicRepository: Repository<Subtopic>,
    @InjectRepository(ExamSyllabusItem)
    private readonly syllabusItemRepository: Repository<ExamSyllabusItem>,
    @InjectRepository(Question)
    private readonly questionRepository: Repository<Question>,
  ) {}

  async create(
    createSubjectDto: CreateSubjectDto,
    actorId?: number,
  ): Promise<Subject> {
    try {
      await this.assertNameIsFree(createSubjectDto.name);

      const subject = this.subjectRepository.create({
        ...createSubjectDto,
        createdBy: actorId ?? null,
      });
      return await this.subjectRepository.save(subject);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create subject');
    }
  }

  async findAll(
    filters: { isActive?: boolean; search?: string } = {},
  ): Promise<Subject[]> {
    try {
      const where: FindOptionsWhere<Subject> = {};
      if (filters.isActive !== undefined) where.isActive = filters.isActive;
      if (filters.search) where.name = ILike(`%${filters.search}%`);

      return await this.subjectRepository.find({
        where,
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to retrieve subjects');
    }
  }

  async findOne(id: number): Promise<Subject> {
    try {
      const subject = await this.subjectRepository.findOne({ where: { id } });
      if (!subject) {
        throw new NotFoundException(`Subject with ID ${id} not found`);
      }
      return subject;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch subject');
    }
  }

  /**
   * The whole global academic structure - subject, topic, subtopic - built
   * from three flat queries instead of a join, which keeps the payload free
   * of duplicated parent rows. This is what the admin syllabus picker reads.
   */
  async getHierarchy(
    filters: { isActive?: boolean; subjectId?: number } = {},
  ): Promise<SubjectHierarchyNode[]> {
    try {
      const subjectWhere: FindOptionsWhere<Subject> = {};
      if (filters.isActive !== undefined) {
        subjectWhere.isActive = filters.isActive;
      }
      if (filters.subjectId !== undefined) subjectWhere.id = filters.subjectId;

      const subjects = await this.subjectRepository.find({
        where: subjectWhere,
        order: { sortOrder: 'ASC', name: 'ASC' },
      });
      if (subjects.length === 0) return [];

      const topicWhere: FindOptionsWhere<Topic> = {};
      if (filters.isActive !== undefined) {
        topicWhere.isActive = filters.isActive;
      }
      const topics = await this.topicRepository.find({
        where: topicWhere,
        order: { sortOrder: 'ASC', name: 'ASC' },
      });

      const subtopicWhere: FindOptionsWhere<Subtopic> = {};
      if (filters.isActive !== undefined) {
        subtopicWhere.isActive = filters.isActive;
      }
      const subtopics = await this.subtopicRepository.find({
        where: subtopicWhere,
        order: { sortOrder: 'ASC', name: 'ASC' },
      });

      const subtopicsByTopic = new Map<number, Subtopic[]>();
      for (const subtopic of subtopics) {
        const bucket = subtopicsByTopic.get(subtopic.topicId) ?? [];
        bucket.push(subtopic);
        subtopicsByTopic.set(subtopic.topicId, bucket);
      }

      const topicsBySubject = new Map<number, Topic[]>();
      for (const topic of topics) {
        const bucket = topicsBySubject.get(topic.subjectId) ?? [];
        bucket.push(topic);
        topicsBySubject.set(topic.subjectId, bucket);
      }

      return subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        description: subject.description,
        sortOrder: subject.sortOrder,
        isActive: subject.isActive,
        topics: (topicsBySubject.get(subject.id) ?? []).map((topic) => ({
          id: topic.id,
          name: topic.name,
          description: topic.description,
          sortOrder: topic.sortOrder,
          isActive: topic.isActive,
          subtopics: (subtopicsByTopic.get(topic.id) ?? []).map((subtopic) => ({
            id: subtopic.id,
            name: subtopic.name,
            description: subtopic.description,
            sortOrder: subtopic.sortOrder,
            isActive: subtopic.isActive,
          })),
        })),
      }));
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to retrieve the academic hierarchy',
      );
    }
  }

  async update(
    id: number,
    updateSubjectDto: UpdateSubjectDto,
    actorId?: number,
  ): Promise<Subject> {
    try {
      const subject = await this.findOne(id);

      if (updateSubjectDto.name && updateSubjectDto.name !== subject.name) {
        await this.assertNameIsFree(updateSubjectDto.name);
      }

      Object.assign(subject, updateSubjectDto, { updatedBy: actorId ?? null });
      return await this.subjectRepository.save(subject);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update subject');
    }
  }

  async setStatus(
    id: number,
    isActive: boolean,
    actorId?: number,
  ): Promise<Subject> {
    return await this.update(id, { isActive }, actorId);
  }

  /**
   * Soft delete, blocked while topics hang off the subject or any syllabus
   * still maps it - a subject is shared, so deleting one would quietly empty
   * every exam that uses it.
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const subject = await this.findOne(id);

      const topicCount = await this.topicRepository.count({
        where: { subjectId: id },
      });
      if (topicCount > 0) {
        throw new ConflictException(
          `Subject with ID ${id} still has ${topicCount} topic(s). Delete them first.`,
        );
      }

      const mappedCount = await this.syllabusItemRepository.count({
        where: { subjectId: id },
      });
      if (mappedCount > 0) {
        throw new ConflictException(
          `Subject with ID ${id} is mapped in ${mappedCount} syllabus item(s). Remove those mappings first.`,
        );
      }

      // The FK is RESTRICT, but that only governs hard deletes. Soft
      // deleting a subject out from under its questions would leave them
      // tagged to a row nothing can see, so it is refused here instead.
      //
      // isActive is not part of the count: questions have no deletedAt, and
      // a deactivated question still holds the tag.
      const questions = await this.questionRepository.count({
        where: { subjectId: id },
      });
      if (questions > 0) {
        throw new ConflictException(
          `Cannot delete this subject: ${questions} question${questions === 1 ? ' is' : 's are'} still tagged to it`,
        );
      }

      subject.deletedBy = actorId ?? null;
      await this.subjectRepository.save(subject);
      await this.subjectRepository.softDelete(id);

      return { message: `Subject with ID ${id} has been successfully removed` };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete subject');
    }
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.subjectRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Subject "${name}" already exists`);
    }
  }
}
