import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, IsNull, Repository } from 'typeorm';
import { ExamSyllabus } from './entities/exam-syllabus.entity';
import { ExamSyllabusItem } from './entities/exam-syllabus-item.entity';
import { ExamPost } from '../exam-posts/entities/exam-post.entity';
import { ExamStage } from '../exam-stages/entities/exam-stage.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { CreateSyllabusDto } from './dto/create-syllabus.dto';
import { UpdateSyllabusDto } from './dto/update-syllabus.dto';
import { CreateSyllabusItemDto } from './dto/create-syllabus-item.dto';
import { CreateSyllabusMappingDto } from './dto/create-syllabus-mapping.dto';
import { UpdateSyllabusItemDto } from './dto/update-syllabus-item.dto';
import { ReorderDto } from '../common/dto/reorder.dto';

/** Weightage carried by a node that is mapped by a syllabus item of its own. */
interface SyllabusNodeMapping {
  /** ID of the row in `exam_syllabus_items`, or null for a node that only
   *  exists because a deeper node is mapped. */
  syllabusItemId: number | null;
  priority: string | null;
  marksWeightage: number | null;
  questionWeightage: number | null;
  sortOrder: number;
  isActive: boolean;
}

export interface SyllabusSubtopicNode extends SyllabusNodeMapping {
  id: number;
  name: string;
}

export interface SyllabusTopicNode extends SyllabusNodeMapping {
  id: number;
  name: string;
  subtopics: SyllabusSubtopicNode[];
}

export interface SyllabusSubjectNode extends SyllabusNodeMapping {
  id: number;
  name: string;
  topics: SyllabusTopicNode[];
}

export interface SyllabusTree {
  exam: {
    id: number;
    name: string;
    shortName: string | null;
    examLevel: { id: number; name: string } | null;
  };
  stage: {
    id: number;
    name: string;
    stageOrder: number;
    examMode: string | null;
  };
  syllabus: {
    id: number;
    title: string | null;
    description: string | null;
    isActive: boolean;
  };
  subjects: SyllabusSubjectNode[];
}

@Injectable()
export class SyllabusService {
  constructor(
    @InjectRepository(ExamSyllabus)
    private readonly syllabusRepository: Repository<ExamSyllabus>,
    @InjectRepository(ExamSyllabusItem)
    private readonly syllabusItemRepository: Repository<ExamSyllabusItem>,
    @InjectRepository(ExamPost)
    private readonly examPostRepository: Repository<ExamPost>,
    @InjectRepository(ExamStage)
    private readonly examStageRepository: Repository<ExamStage>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Subtopic)
    private readonly subtopicRepository: Repository<Subtopic>,
  ) {}

  // ---------------------------------------------------------------------
  // Syllabus
  // ---------------------------------------------------------------------

  async create(
    createSyllabusDto: CreateSyllabusDto,
    actorId?: number,
  ): Promise<ExamSyllabus> {
    try {
      await this.assertStageBelongsToExam(
        createSyllabusDto.examId,
        createSyllabusDto.examStageId,
      );

      const existing = await this.syllabusRepository.findOne({
        where: { examStageId: createSyllabusDto.examStageId },
      });
      if (existing) {
        throw new ConflictException(
          `Exam stage ${createSyllabusDto.examStageId} already has a syllabus (ID ${existing.id})`,
        );
      }

      const syllabus = this.syllabusRepository.create({
        ...createSyllabusDto,
        createdBy: actorId ?? null,
      });
      return await this.syllabusRepository.save(syllabus);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to create syllabus');
    }
  }

  async findAll(
    filters: {
      examId?: number;
      examStageId?: number;
      isActive?: boolean;
    } = {},
  ): Promise<ExamSyllabus[]> {
    try {
      const where: FindOptionsWhere<ExamSyllabus> = {};
      if (filters.examId !== undefined) where.examId = filters.examId;
      if (filters.examStageId !== undefined) {
        where.examStageId = filters.examStageId;
      }
      if (filters.isActive !== undefined) where.isActive = filters.isActive;

      return await this.syllabusRepository.find({
        where,
        relations: ['exam', 'examStage'],
        order: { examId: 'ASC', examStageId: 'ASC' },
      });
    } catch {
      throw new InternalServerErrorException('Failed to retrieve syllabi');
    }
  }

  async findOne(id: number): Promise<ExamSyllabus> {
    try {
      const syllabus = await this.syllabusRepository.findOne({
        where: { id },
        relations: ['exam', 'exam.examLevel', 'examStage'],
      });
      if (!syllabus) {
        throw new NotFoundException(`Syllabus with ID ${id} not found`);
      }
      return syllabus;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch syllabus');
    }
  }

  async findByStage(examStageId: number): Promise<ExamSyllabus> {
    try {
      const syllabus = await this.syllabusRepository.findOne({
        where: { examStageId },
        relations: ['exam', 'exam.examLevel', 'examStage'],
      });
      if (!syllabus) {
        throw new NotFoundException(
          `No syllabus found for exam stage ${examStageId}`,
        );
      }
      return syllabus;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch syllabus');
    }
  }

  async update(
    id: number,
    updateSyllabusDto: UpdateSyllabusDto,
    actorId?: number,
  ): Promise<ExamSyllabus> {
    try {
      const syllabus = await this.findOne(id);
      Object.assign(syllabus, updateSyllabusDto, {
        updatedBy: actorId ?? null,
      });
      return await this.syllabusRepository.save(syllabus);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to update syllabus');
    }
  }

  /**
   * Soft-deletes the syllabus and hard-deletes its items in one transaction.
   * The items are a mapping onto shared academic rows - keeping them behind a
   * deleted syllabus would go on blocking the deletion of those rows.
   */
  async remove(id: number, actorId?: number): Promise<{ message: string }> {
    try {
      const syllabus = await this.findOne(id);

      await this.syllabusRepository.manager.transaction(async (manager) => {
        await manager.delete(ExamSyllabusItem, { syllabusId: id });
        await manager.update(ExamSyllabus, id, {
          deletedBy: actorId ?? null,
        });
        await manager.softDelete(ExamSyllabus, id);
      });

      return {
        message: `Syllabus with ID ${syllabus.id} has been successfully removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete syllabus');
    }
  }

  // ---------------------------------------------------------------------
  // Syllabus items
  // ---------------------------------------------------------------------

  async findItems(syllabusId: number): Promise<ExamSyllabusItem[]> {
    try {
      await this.findOne(syllabusId);
      return await this.syllabusItemRepository.find({
        where: { syllabusId },
        relations: ['subject', 'topic', 'subtopic'],
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to retrieve syllabus items',
      );
    }
  }

  /**
   * Adds a subject, a topic or a subtopic to a syllabus after checking that
   * the combination actually exists in the academic tree and is not already
   * mapped.
   */
  async addItem(
    syllabusId: number,
    createSyllabusItemDto: CreateSyllabusItemDto,
    actorId?: number,
  ): Promise<ExamSyllabusItem> {
    try {
      await this.findOne(syllabusId);

      const { subjectId, topicId, subtopicId } =
        await this.resolveAcademicSelection(createSyllabusItemDto);

      await this.assertNotAlreadyMapped(
        syllabusId,
        subjectId,
        topicId,
        subtopicId,
      );

      const item = this.syllabusItemRepository.create({
        ...createSyllabusItemDto,
        syllabusId,
        topicId: topicId ?? null,
        subtopicId: subtopicId ?? null,
        createdBy: actorId ?? null,
      });
      const saved = await this.syllabusItemRepository.save(item);

      return await this.findItem(syllabusId, saved.id);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to add the syllabus item');
    }
  }

  /**
   * Maps academic content onto an exam stage directly, creating the stage
   * syllabus on first use. Lets the admin UI go straight from "SI of Police /
   * Preliminary" to "Article 21" in one call.
   */
  async addMapping(
    createSyllabusMappingDto: CreateSyllabusMappingDto,
    actorId?: number,
  ): Promise<ExamSyllabusItem> {
    const { examId, examStageId, ...itemDto } = createSyllabusMappingDto;

    await this.assertStageBelongsToExam(examId, examStageId);

    let syllabus = await this.syllabusRepository.findOne({
      where: { examStageId },
    });
    if (!syllabus) {
      syllabus = await this.create({ examId, examStageId }, actorId);
    }

    return await this.addItem(syllabus.id, itemDto, actorId);
  }

  async findItem(
    syllabusId: number,
    itemId: number,
  ): Promise<ExamSyllabusItem> {
    const item = await this.syllabusItemRepository.findOne({
      where: { id: itemId, syllabusId },
      relations: ['subject', 'topic', 'subtopic'],
    });
    if (!item) {
      throw new NotFoundException(
        `Syllabus item with ID ${itemId} not found in syllabus ${syllabusId}`,
      );
    }
    return item;
  }

  /** Updates priority, marks/question weightage, ordering or active flag. */
  async updateItem(
    syllabusId: number,
    itemId: number,
    updateSyllabusItemDto: UpdateSyllabusItemDto,
    actorId?: number,
  ): Promise<ExamSyllabusItem> {
    try {
      const item = await this.findItem(syllabusId, itemId);

      Object.assign(item, updateSyllabusItemDto, {
        updatedBy: actorId ?? null,
      });
      await this.syllabusItemRepository.save(item);

      return await this.findItem(syllabusId, itemId);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to update the syllabus item',
      );
    }
  }

  /** Rewrites `sortOrder` for items of one syllabus in a single transaction. */
  async reorderItems(
    syllabusId: number,
    reorderDto: ReorderDto,
    actorId?: number,
  ): Promise<ExamSyllabusItem[]> {
    try {
      await this.findOne(syllabusId);

      const ids = reorderDto.items.map((item) => item.id);
      if (new Set(ids).size !== ids.length) {
        throw new BadRequestException('Duplicate item IDs in the request');
      }

      const items = await this.syllabusItemRepository.find({
        where: { id: In(ids), syllabusId },
      });
      if (items.length !== ids.length) {
        throw new BadRequestException(
          `All items must belong to syllabus ${syllabusId}`,
        );
      }

      await this.syllabusItemRepository.manager.transaction(async (manager) => {
        for (const item of reorderDto.items) {
          await manager.update(ExamSyllabusItem, item.id, {
            sortOrder: item.sortOrder,
            updatedBy: actorId ?? null,
          });
        }
      });

      return await this.findItems(syllabusId);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to reorder the syllabus items',
      );
    }
  }

  async removeItem(
    syllabusId: number,
    itemId: number,
  ): Promise<{ message: string }> {
    try {
      const item = await this.findItem(syllabusId, itemId);
      await this.syllabusItemRepository.delete(item.id);
      return {
        message: `Syllabus item with ID ${itemId} has been removed from syllabus ${syllabusId}`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to remove the syllabus item',
      );
    }
  }

  /** Removes a subject from a syllabus together with its topics and subtopics. */
  async removeSubject(
    syllabusId: number,
    subjectId: number,
  ): Promise<{ message: string }> {
    return await this.removeBy(
      syllabusId,
      { syllabusId, subjectId },
      `subject ${subjectId}`,
    );
  }

  /** Removes a topic from a syllabus together with its subtopics. */
  async removeTopic(
    syllabusId: number,
    topicId: number,
  ): Promise<{ message: string }> {
    return await this.removeBy(
      syllabusId,
      { syllabusId, topicId },
      `topic ${topicId}`,
    );
  }

  async removeSubtopic(
    syllabusId: number,
    subtopicId: number,
  ): Promise<{ message: string }> {
    return await this.removeBy(
      syllabusId,
      { syllabusId, subtopicId },
      `subtopic ${subtopicId}`,
    );
  }

  // ---------------------------------------------------------------------
  // Retrieval
  // ---------------------------------------------------------------------

  /** The complete syllabus of a stage, nested subject -> topic -> subtopic. */
  async getTree(syllabusId: number): Promise<SyllabusTree> {
    const syllabus = await this.findOne(syllabusId);
    return await this.buildTree(syllabus);
  }

  async getTreeByStage(examStageId: number): Promise<SyllabusTree> {
    const syllabus = await this.findByStage(examStageId);
    return await this.buildTree(syllabus);
  }

  /** Every stage of an exam with its syllabus, in the order they are held. */
  async getTreesByExam(examId: number): Promise<SyllabusTree[]> {
    const exam = await this.examPostRepository.findOne({
      where: { id: examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    const stages = await this.examStageRepository.find({
      where: { examId },
      order: { stageOrder: 'ASC', name: 'ASC' },
    });

    const trees: SyllabusTree[] = [];
    for (const stage of stages) {
      const syllabus = await this.syllabusRepository.findOne({
        where: { examStageId: stage.id },
        relations: ['exam', 'exam.examLevel', 'examStage'],
      });
      if (syllabus) trees.push(await this.buildTree(syllabus));
    }
    return trees;
  }

  private async buildTree(syllabus: ExamSyllabus): Promise<SyllabusTree> {
    const items = await this.syllabusItemRepository.find({
      where: { syllabusId: syllabus.id },
      relations: ['subject', 'topic', 'subtopic'],
      order: { sortOrder: 'ASC', id: 'ASC' },
    });

    const subjectNodes = new Map<number, SyllabusSubjectNode>();
    const topicNodes = new Map<number, SyllabusTopicNode>();

    for (const item of items) {
      if (!item.subject) continue;

      let subjectNode = subjectNodes.get(item.subjectId);
      if (!subjectNode) {
        subjectNode = {
          id: item.subject.id,
          name: item.subject.name,
          ...this.emptyMapping(),
          topics: [],
        };
        subjectNodes.set(item.subjectId, subjectNode);
      }

      // A subject-only item carries the weightage of the subject itself.
      if (item.topicId === null) {
        Object.assign(subjectNode, this.mappingOf(item));
        continue;
      }

      if (!item.topic) continue;

      let topicNode = topicNodes.get(item.topicId);
      if (!topicNode) {
        topicNode = {
          id: item.topic.id,
          name: item.topic.name,
          ...this.emptyMapping(),
          subtopics: [],
        };
        topicNodes.set(item.topicId, topicNode);
        subjectNode.topics.push(topicNode);
      }

      if (item.subtopicId === null) {
        Object.assign(topicNode, this.mappingOf(item));
        continue;
      }

      if (!item.subtopic) continue;

      topicNode.subtopics.push({
        id: item.subtopic.id,
        name: item.subtopic.name,
        ...this.mappingOf(item),
      });
    }

    const byOrderThenName = (
      a: { sortOrder: number; name: string },
      b: { sortOrder: number; name: string },
    ) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

    const subjects = [...subjectNodes.values()].sort(byOrderThenName);
    for (const subject of subjects) {
      subject.topics.sort(byOrderThenName);
      for (const topic of subject.topics) {
        topic.subtopics.sort(byOrderThenName);
      }
    }

    return {
      exam: {
        id: syllabus.exam.id,
        name: syllabus.exam.name,
        shortName: syllabus.exam.shortName,
        examLevel: syllabus.exam.examLevel
          ? {
              id: syllabus.exam.examLevel.id,
              name: syllabus.exam.examLevel.name,
            }
          : null,
      },
      stage: {
        id: syllabus.examStage.id,
        name: syllabus.examStage.name,
        stageOrder: syllabus.examStage.stageOrder,
        examMode: syllabus.examStage.examMode,
      },
      syllabus: {
        id: syllabus.id,
        title: syllabus.title,
        description: syllabus.description,
        isActive: syllabus.isActive,
      },
      subjects,
    };
  }

  // ---------------------------------------------------------------------
  // Validation helpers
  // ---------------------------------------------------------------------

  /**
   * A stage only belongs to one exam; mapping a syllabus onto the stage of a
   * different exam would silently mix two hierarchies.
   */
  private async assertStageBelongsToExam(
    examId: number,
    examStageId: number,
  ): Promise<ExamStage> {
    const exam = await this.examPostRepository.findOne({
      where: { id: examId },
    });
    if (!exam) {
      throw new NotFoundException(`Exam with ID ${examId} not found`);
    }

    const stage = await this.examStageRepository.findOne({
      where: { id: examStageId },
    });
    if (!stage) {
      throw new NotFoundException(
        `Exam stage with ID ${examStageId} not found`,
      );
    }
    if (stage.examId !== examId) {
      throw new BadRequestException(
        `Exam stage ${examStageId} does not belong to exam ${examId}`,
      );
    }
    return stage;
  }

  /**
   * Checks the subject/topic/subtopic combination against the academic tree:
   * a topic must sit under the given subject and a subtopic under the given
   * topic, so "Indian Constitution + Kerala Renaissance" is rejected.
   */
  private async resolveAcademicSelection(dto: {
    subjectId: number;
    topicId?: number | null;
    subtopicId?: number | null;
  }): Promise<{
    subjectId: number;
    topicId: number | null;
    subtopicId: number | null;
  }> {
    const topicId = dto.topicId ?? null;
    const subtopicId = dto.subtopicId ?? null;

    if (subtopicId !== null && topicId === null) {
      throw new BadRequestException(
        'topicId is required when a subtopicId is given',
      );
    }

    const subject = await this.subjectRepository.findOne({
      where: { id: dto.subjectId },
    });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${dto.subjectId} not found`);
    }

    if (topicId !== null) {
      const topic = await this.topicRepository.findOne({
        where: { id: topicId },
      });
      if (!topic) {
        throw new NotFoundException(`Topic with ID ${topicId} not found`);
      }
      if (topic.subjectId !== dto.subjectId) {
        throw new BadRequestException(
          `Topic "${topic.name}" does not belong to subject "${subject.name}"`,
        );
      }
    }

    if (subtopicId !== null) {
      const subtopic = await this.subtopicRepository.findOne({
        where: { id: subtopicId },
      });
      if (!subtopic) {
        throw new NotFoundException(`Subtopic with ID ${subtopicId} not found`);
      }
      if (subtopic.topicId !== topicId) {
        throw new BadRequestException(
          `Subtopic "${subtopic.name}" does not belong to topic ${topicId}`,
        );
      }
    }

    return { subjectId: dto.subjectId, topicId, subtopicId };
  }

  /**
   * The same subject/topic/subtopic combination may only appear once in a
   * syllabus. The partial unique indexes on the table enforce this too; this
   * check is what turns a race-free constraint into a readable 409.
   */
  private async assertNotAlreadyMapped(
    syllabusId: number,
    subjectId: number,
    topicId: number | null,
    subtopicId: number | null,
  ): Promise<void> {
    const existing = await this.syllabusItemRepository.findOne({
      where: {
        syllabusId,
        subjectId,
        topicId: topicId === null ? IsNull() : topicId,
        subtopicId: subtopicId === null ? IsNull() : subtopicId,
      },
    });
    if (existing) {
      throw new ConflictException(
        `This combination is already mapped in syllabus ${syllabusId} (item ID ${existing.id})`,
      );
    }
  }

  private async removeBy(
    syllabusId: number,
    where: FindOptionsWhere<ExamSyllabusItem>,
    label: string,
  ): Promise<{ message: string }> {
    try {
      await this.findOne(syllabusId);

      const result = await this.syllabusItemRepository.delete(where);
      if (!result.affected) {
        throw new NotFoundException(
          `No syllabus item found for ${label} in syllabus ${syllabusId}`,
        );
      }

      return {
        message: `Removed ${result.affected} syllabus item(s) for ${label} from syllabus ${syllabusId}`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException(
        'Failed to remove the syllabus items',
      );
    }
  }

  private emptyMapping(): SyllabusNodeMapping {
    return {
      syllabusItemId: null,
      priority: null,
      marksWeightage: null,
      questionWeightage: null,
      sortOrder: 0,
      isActive: true,
    };
  }

  private mappingOf(item: ExamSyllabusItem): SyllabusNodeMapping {
    return {
      syllabusItemId: item.id,
      priority: item.priority,
      marksWeightage: item.marksWeightage,
      questionWeightage: item.questionWeightage,
      sortOrder: item.sortOrder,
      isActive: item.isActive,
    };
  }
}
