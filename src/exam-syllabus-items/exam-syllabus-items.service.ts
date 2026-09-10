import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { ExamSyllabusItem } from './entities/exam-syllabus-item.entity';
import { ExamSyllabus } from '../exam-syllabi/entities/exam-syllabus.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { CreateExamSyllabusItemDto } from './dto/create-exam-syllabus-item.dto';
import { UpdateExamSyllabusItemDto } from './dto/update-exam-syllabus-item.dto';

// Postgres unique_violation - one of the three partial indexes on this
// table, whichever governs the depth being written.
const UNIQUE_VIOLATION = '23505';

@Injectable()
export class ExamSyllabusItemsService {
  constructor(
    @InjectRepository(ExamSyllabusItem)
    private readonly itemRepository: Repository<ExamSyllabusItem>,
    @InjectRepository(ExamSyllabus)
    private readonly syllabusRepository: Repository<ExamSyllabus>,
    @InjectRepository(Subject)
    private readonly subjectRepository: Repository<Subject>,
    @InjectRepository(Topic)
    private readonly topicRepository: Repository<Topic>,
    @InjectRepository(Subtopic)
    private readonly subtopicRepository: Repository<Subtopic>,
  ) {}

  /**
   * The DTO carries the weightage as a number, which is the right shape on
   * the wire, but the column is numeric and the pg driver reads and writes
   * it as a string to keep the precision exact. toFixed(2) matches the scale
   * the column declares.
   */
  private toWeightage(value: number | undefined): string | undefined {
    return value === undefined ? undefined : value.toFixed(2);
  }

  /** An item may only sit in a syllabus that exists and is still live. */
  private async assertSyllabusExists(syllabusId: number) {
    const syllabus = await this.syllabusRepository.findOne({
      where: { id: syllabusId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!syllabus) {
      throw new NotFoundException(
        `Exam syllabus with ID ${syllabusId} not found`,
      );
    }
  }

  /**
   * Validates the item's place in the academic hierarchy.
   *
   * This deliberately duplicates QuestionsService.assertTaxonomy rather than
   * sharing it. The rules are the same - each id exists and is live, each
   * belongs to the one above it, no gaps - but the shapes differ: a question
   * may be untagged entirely, while an item always names a subject, so there
   * is no "all three null" case here. Extracting a common validator would
   * mean parameterising that difference and finding a home for it that both
   * modules can import without either owning it. If a third caller appears,
   * that trade changes and this should be lifted out.
   *
   * Rules, in the order they are cheapest to check:
   *   1. No gaps - a subtopic needs a topic. (subjectId is required by the
   *      DTO, so the topic-needs-subject case cannot arise on create; on
   *      update it is still checked, since the resolved subject comes from
   *      the stored row.)
   *   2. Each id exists and is not soft-deleted (404).
   *   3. Each id belongs to the one above it (400).
   */
  private async assertTaxonomy(
    subjectId: number,
    topicId: number | null,
    subtopicId: number | null,
  ): Promise<void> {
    if (subtopicId !== null && topicId === null) {
      throw new BadRequestException(
        'topicId is required when subtopicId is set',
      );
    }

    const subject = await this.subjectRepository.findOne({
      where: { id: subjectId, deletedAt: IsNull() },
      select: { id: true },
    });
    if (!subject) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }

    if (topicId !== null) {
      // subjectId comes back too: it is what rule 3 compares against.
      const topic = await this.topicRepository.findOne({
        where: { id: topicId, deletedAt: IsNull() },
        select: { id: true, subjectId: true },
      });
      if (!topic) {
        throw new NotFoundException(`Topic with ID ${topicId} not found`);
      }
      if (topic.subjectId !== subjectId) {
        throw new BadRequestException(
          `Topic ${topicId} does not belong to subject ${subjectId}`,
        );
      }
    }

    if (subtopicId !== null) {
      const subtopic = await this.subtopicRepository.findOne({
        where: { id: subtopicId, deletedAt: IsNull() },
        select: { id: true, topicId: true },
      });
      if (!subtopic) {
        throw new NotFoundException(
          `Subtopic with ID ${subtopicId} not found`,
        );
      }
      if (subtopic.topicId !== topicId) {
        throw new BadRequestException(
          `Subtopic ${subtopicId} does not belong to topic ${topicId}`,
        );
      }
    }
  }

  /**
   * Rejects a mapping the syllabus already holds at the same depth.
   *
   * Matching on the exact four-column tuple, with IsNull() where an id is
   * absent, covers all three partial indexes at once: the depth is decided
   * by which of topicId and subtopicId are null, and this compares them as
   * they are rather than ignoring them.
   */
  private async assertMappingFree(
    syllabusId: number,
    subjectId: number,
    topicId: number | null,
    subtopicId: number | null,
    excludeId?: number,
  ) {
    const clash = await this.itemRepository.findOne({
      where: {
        syllabusId,
        subjectId,
        topicId: topicId === null ? IsNull() : topicId,
        subtopicId: subtopicId === null ? IsNull() : subtopicId,
        ...(excludeId ? { id: Not(excludeId) } : {}),
      },
      select: { id: true },
    });
    if (clash) {
      throw new ConflictException(
        'This syllabus already maps that subject, topic and subtopic combination',
      );
    }
  }

  async create(createDto: CreateExamSyllabusItemDto) {
    try {
      const { marksWeightage, ...rest } = createDto;
      const topicId = createDto.topicId ?? null;
      const subtopicId = createDto.subtopicId ?? null;

      await this.assertSyllabusExists(createDto.syllabusId);
      await this.assertTaxonomy(createDto.subjectId, topicId, subtopicId);
      await this.assertMappingFree(
        createDto.syllabusId,
        createDto.subjectId,
        topicId,
        subtopicId,
      );

      const item = this.itemRepository.create({
        ...rest,
        topicId,
        subtopicId,
        marksWeightage: this.toWeightage(marksWeightage) ?? null,
      });
      return await this.itemRepository.save(item);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      // The check above loses a race; the indexes are the real guarantee.
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'This syllabus already maps that subject, topic and subtopic combination',
        );
      }
      throw new InternalServerErrorException('Failed to create syllabus item');
    }
  }

  async findAll(syllabusId?: number, subjectId?: number) {
    try {
      return await this.itemRepository.find({
        where: {
          ...(syllabusId ? { syllabusId } : {}),
          ...(subjectId ? { subjectId } : {}),
        },
        order: { sortOrder: 'ASC', id: 'ASC' },
      });
    } catch (err) {
      throw new InternalServerErrorException(
        'Failed to retrieve syllabus items',
      );
    }
  }

  async findOne(id: number) {
    try {
      const item = await this.itemRepository.findOne({ where: { id } });
      if (!item) {
        throw new NotFoundException('Syllabus item not found');
      }
      return item;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to fetch syllabus item');
    }
  }

  async update(id: number, updateDto: UpdateExamSyllabusItemDto) {
    try {
      const item = await this.findOne(id);
      const { marksWeightage, ...rest } = updateDto;

      // Resolved against the stored row, not read off the request: changing
      // one id can break the chain, and clearing one changes which unique
      // index governs the row.
      const syllabusId = updateDto.syllabusId ?? item.syllabusId;
      const subjectId = updateDto.subjectId ?? item.subjectId;
      const topicId =
        updateDto.topicId === undefined ? item.topicId : updateDto.topicId;
      const subtopicId =
        updateDto.subtopicId === undefined
          ? item.subtopicId
          : updateDto.subtopicId;

      if (updateDto.syllabusId !== undefined) {
        await this.assertSyllabusExists(syllabusId);
      }

      await this.assertTaxonomy(subjectId, topicId, subtopicId);

      // Re-checked whenever any part of the key moves - including a cleared
      // topicId or subtopicId, which shifts the row to a shallower depth
      // where a different item may already be sitting.
      if (
        syllabusId !== item.syllabusId ||
        subjectId !== item.subjectId ||
        topicId !== item.topicId ||
        subtopicId !== item.subtopicId
      ) {
        await this.assertMappingFree(
          syllabusId,
          subjectId,
          topicId,
          subtopicId,
          id,
        );
      }

      Object.assign(item, rest, {
        syllabusId,
        subjectId,
        topicId,
        subtopicId,
      });

      // Assigned separately from the spread: the weightage needs converting,
      // and an absent field must leave the stored value alone.
      const weightage = this.toWeightage(marksWeightage);
      if (weightage !== undefined) item.marksWeightage = weightage;

      return await this.itemRepository.save(item);
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if ((err as { code?: string })?.code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          'This syllabus already maps that subject, topic and subtopic combination',
        );
      }
      throw new InternalServerErrorException('Failed to update syllabus item');
    }
  }

  /**
   * Hard delete, per architecture.md: an item is a mapping, not a record
   * worth keeping once it leaves a syllabus. The table has no deletedAt to
   * set, and nothing references an item, so there is no child guard here.
   */
  async remove(id: number): Promise<{ message: string }> {
    try {
      const item = await this.findOne(id);

      await this.itemRepository.delete(item.id);
      return {
        message: `Syllabus item with ID ${id} has been permanently removed`,
      };
    } catch (err) {
      if (err instanceof HttpException) throw err;
      throw new InternalServerErrorException('Failed to delete syllabus item');
    }
  }
}
