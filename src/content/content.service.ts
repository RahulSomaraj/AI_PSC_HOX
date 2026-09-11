import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository, SelectQueryBuilder } from 'typeorm';
import { Content } from './entities/content.entity';
import { Batch } from '../batches/entities/batch.entity';
import { Subject } from '../subjects/entities/subject.entity';
import { Topic } from '../topics/entities/topic.entity';
import { Subtopic } from '../subtopics/entities/subtopic.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { FindContentQueryDto } from './dto/find-content-query.dto';

/** Who is asking. Students are narrowed to what they may see. */
export interface Viewer {
  userId: number;
  /** admin or staff - sees drafts, and every batch's material. */
  isStaff: boolean;
}

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly content: Repository<Content>,
    @InjectRepository(Batch)
    private readonly batches: Repository<Batch>,
    @InjectRepository(Subject)
    private readonly subjects: Repository<Subject>,
    @InjectRepository(Topic)
    private readonly topics: Repository<Topic>,
    @InjectRepository(Subtopic)
    private readonly subtopics: Repository<Subtopic>,
    @InjectRepository(AspirantProfile)
    private readonly profiles: Repository<AspirantProfile>,
  ) {}

  async create(dto: CreateContentDto, actorId: number) {
    await this.assertTaxonomy(
      dto.subjectId,
      dto.topicId ?? null,
      dto.subtopicId ?? null,
    );
    this.assertExactlyOneSource(dto.fileUrl ?? null, dto.sourceUrl ?? null);
    await this.assertBatchesExist(dto.batchIds);

    const saved = await this.content.save(
      this.content.create({
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        fileUrl: dto.fileUrl ?? null,
        sourceUrl: dto.sourceUrl ?? null,
        subjectId: dto.subjectId,
        topicId: dto.topicId ?? null,
        subtopicId: dto.subtopicId ?? null,
        batches: (dto.batchIds ?? []).map((id) => ({ id }) as Batch),
        isPublished: dto.isPublished ?? false,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );

    return this.findOne(saved.id, { userId: actorId, isStaff: true });
  }

  async findAll(query: FindContentQueryDto, viewer: Viewer) {
    const { page, limit } = query;

    const qb = this.content
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.subject', 'subject')
      .leftJoinAndSelect('content.topic', 'topic')
      .leftJoinAndSelect('content.subtopic', 'subtopic')
      // leftJoin rather than an inner join used as a filter: the batch
      // filter below is an EXISTS, so this one keeps every attached batch on
      // the row instead of returning only the batch that matched.
      .leftJoinAndSelect('content.batches', 'batch');

    if (query.search) {
      qb.andWhere(
        '(content.title ILIKE :search OR content.description ILIKE :search)',
        { search: `%${query.search.replace(/[\\%_]/g, '\\$&')}%` },
      );
    }
    if (query.type) qb.andWhere('content.type = :type', { type: query.type });
    if (query.subjectId) {
      qb.andWhere('content.subjectId = :subjectId', {
        subjectId: query.subjectId,
      });
    }
    if (query.topicId) {
      qb.andWhere('content.topicId = :topicId', { topicId: query.topicId });
    }
    if (query.subtopicId) {
      qb.andWhere('content.subtopicId = :subtopicId', {
        subtopicId: query.subtopicId,
      });
    }

    await this.applyVisibility(qb, query, viewer);

    const [records, total] = await qb
      .orderBy('content.createdAt', 'DESC')
      .addOrderBy('content.id', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: records.map((record) => this.present(record)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, viewer: Viewer) {
    const qb = this.content
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.subject', 'subject')
      .leftJoinAndSelect('content.topic', 'topic')
      .leftJoinAndSelect('content.subtopic', 'subtopic')
      .leftJoinAndSelect('content.batches', 'batch')
      .where('content.id = :id', { id });

    await this.applyVisibility(qb, {}, viewer);

    const record = await qb.getOne();
    // A draft, or another batch's material, is 404 rather than 403: a
    // student should not learn an item exists by being refused it.
    if (!record) throw new NotFoundException('Content not found');

    return this.present(record);
  }

  async update(id: number, dto: UpdateContentDto, actorId: number) {
    const record = await this.content.findOne({
      where: { id },
      relations: { batches: true },
    });
    if (!record) throw new NotFoundException('Content not found');

    // Validate what the row will hold after the merge, not what arrived.
    // A PATCH sending only `subjectId` can orphan a topic that is already
    // stored, and checking the body alone would let it through.
    const subjectId = dto.subjectId ?? record.subjectId;
    const topicId = dto.topicId !== undefined ? dto.topicId : record.topicId;
    const subtopicId =
      dto.subtopicId !== undefined ? dto.subtopicId : record.subtopicId;
    await this.assertTaxonomy(subjectId, topicId, subtopicId);

    const fileUrl = dto.fileUrl !== undefined ? dto.fileUrl : record.fileUrl;
    const sourceUrl =
      dto.sourceUrl !== undefined ? dto.sourceUrl : record.sourceUrl;
    this.assertExactlyOneSource(fileUrl, sourceUrl);

    if (dto.batchIds !== undefined) {
      await this.assertBatchesExist(dto.batchIds);
      record.batches = dto.batchIds.map(
        (batchId) => ({ id: batchId }) as Batch,
      );
    }

    if (dto.title !== undefined) record.title = dto.title;
    if (dto.description !== undefined) record.description = dto.description;
    if (dto.type !== undefined) record.type = dto.type;
    if (dto.isPublished !== undefined) record.isPublished = dto.isPublished;
    record.subjectId = subjectId;
    record.topicId = topicId;
    record.subtopicId = subtopicId;
    record.fileUrl = fileUrl;
    record.sourceUrl = sourceUrl;
    record.updatedBy = actorId;

    await this.content.save(record);

    return this.findOne(id, { userId: actorId, isStaff: true });
  }

  async remove(id: number, actorId: number) {
    const record = await this.content.findOne({ where: { id } });
    if (!record) throw new NotFoundException('Content not found');

    // Stamp the actor before the soft delete, so deleted_by survives.
    await this.content.update(id, { deletedBy: actorId });
    await this.content.softDelete(id);

    return { message: 'Content deleted successfully' };
  }

  /**
   * Narrows a query to what the caller may see.
   *
   * Staff see everything and may filter drafts either way. A student sees
   * published items only, and among those only the ones attached to no
   * batch at all - the library's shared shelf - or attached to the batch
   * they are in.
   *
   * Both branches are EXISTS subqueries rather than joins, so that adding
   * this filter never changes which batches come back on a row.
   */
  private async applyVisibility(
    qb: SelectQueryBuilder<Content>,
    query: { batchId?: number; isPublished?: boolean },
    viewer: Viewer,
  ) {
    const attachedToAny =
      'SELECT 1 FROM content_batches cb WHERE cb.content_id = content.id';

    if (viewer.isStaff) {
      if (query.isPublished !== undefined) {
        qb.andWhere('content.isPublished = :isPublished', {
          isPublished: query.isPublished,
        });
      }
      if (query.batchId) {
        qb.andWhere(
          `EXISTS (${attachedToAny} AND cb.batch_id = :filterBatchId)`,
          { filterBatchId: query.batchId },
        );
      }
      return;
    }

    qb.andWhere('content.isPublished = true');

    const profile = await this.profiles.findOne({
      where: { userId: viewer.userId },
      select: { id: true, batchId: true },
    });
    const batchId = profile?.batchId ?? null;

    if (batchId === null) {
      qb.andWhere(`NOT EXISTS (${attachedToAny})`);
    } else {
      qb.andWhere(
        `(NOT EXISTS (${attachedToAny})
          OR EXISTS (${attachedToAny} AND cb.batch_id = :viewerBatchId))`,
        { viewerBatchId: batchId },
      );
    }
  }

  /**
   * An item must point at exactly one thing.
   *
   * Neither means a library row that opens nothing. Both means two answers
   * to "where is this", and every reader would have to pick one.
   */
  private assertExactlyOneSource(
    fileUrl: string | null,
    sourceUrl: string | null,
  ) {
    if (fileUrl && sourceUrl) {
      throw new BadRequestException(
        'Send either fileUrl or sourceUrl, not both',
      );
    }
    if (!fileUrl && !sourceUrl) {
      throw new BadRequestException('Either fileUrl or sourceUrl is required');
    }
  }

  private async assertBatchesExist(batchIds?: number[]) {
    if (!batchIds?.length) return;

    const wanted = new Set(batchIds);
    const found = await this.batches.countBy({
      id: In([...wanted]),
      deletedAt: IsNull(),
    });
    if (found !== wanted.size) {
      throw new NotFoundException('One or more batches were not found');
    }
  }

  /**
   * Validates the item's place in the academic hierarchy.
   *
   * The same rules `QuestionsService.assertTaxonomy` applies, kept
   * deliberately identical so a subject/topic/subtopic tag means the same
   * thing on a question and on a library item. Duplicated rather than shared
   * because that file belongs to the other developer's track - see CLAUDE.md
   * section 3. Worth extracting to `common/` once both sides agree.
   *
   *   1. No gaps - a subtopic needs a topic. (Subject is always required
   *      here, unlike on a question, so the topic-needs-subject rule is
   *      satisfied by the column being NOT NULL.)
   *   2. Each id exists and is not soft-deleted (404).
   *   3. Each id belongs to the one above it (400).
   */
  private async assertTaxonomy(
    subjectId: number,
    topicId: number | null,
    subtopicId: number | null,
  ) {
    if (subtopicId !== null && topicId === null) {
      throw new BadRequestException(
        'topicId is required when subtopicId is set',
      );
    }

    const subjectExists = await this.subjects.existsBy({
      id: subjectId,
      deletedAt: IsNull(),
    });
    if (!subjectExists) {
      throw new NotFoundException(`Subject with ID ${subjectId} not found`);
    }

    if (topicId !== null) {
      const topic = await this.topics.findOne({
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
      const subtopic = await this.subtopics.findOne({
        where: { id: subtopicId, deletedAt: IsNull() },
        select: { id: true, topicId: true },
      });
      if (!subtopic) {
        throw new NotFoundException(`Subtopic with ID ${subtopicId} not found`);
      }
      if (subtopic.topicId !== topicId) {
        throw new BadRequestException(
          `Subtopic ${subtopicId} does not belong to topic ${topicId}`,
        );
      }
    }
  }

  private present(record: Content) {
    const named = (row?: { id: number; name: string } | null) =>
      row ? { id: row.id, name: row.name } : null;

    return {
      id: record.id,
      title: record.title,
      description: record.description,
      type: record.type,
      fileUrl: record.fileUrl,
      sourceUrl: record.sourceUrl,
      subject: named(record.subject),
      topic: named(record.topic),
      subtopic: named(record.subtopic),
      // Name-sorted, matching how the faculty row presents its batches.
      batches: (record.batches ?? [])
        .map((batch) => ({ id: batch.id, name: batch.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      isPublished: record.isPublished,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
