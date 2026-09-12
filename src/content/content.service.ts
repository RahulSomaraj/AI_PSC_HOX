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
import { ExamLevel } from '../exam-levels/entities/exam-level.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { FindContentQueryDto } from './dto/find-content-query.dto';
import { ContentStatus } from './content-type.enum';
import { ContentViewsService } from '../content-views/content-views.service';

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
    @InjectRepository(ExamLevel)
    private readonly examLevels: Repository<ExamLevel>,
    @InjectRepository(AspirantProfile)
    private readonly profiles: Repository<AspirantProfile>,
    private readonly contentViews: ContentViewsService,
  ) {}

  async create(dto: CreateContentDto, actorId: number) {
    await this.assertTaxonomy(
      dto.subjectId ?? null,
      dto.topicId ?? null,
      dto.subtopicId ?? null,
    );
    await this.assertExamLevelExists(dto.examLevelId ?? null);
    this.assertExactlyOneSource(dto.fileUrl ?? null, dto.linkUrl ?? null);
    await this.assertBatchesExist(dto.batchIds);

    const saved = await this.content.save(
      this.content.create({
        title: dto.title,
        description: dto.description ?? null,
        type: dto.type,
        fileUrl: dto.fileUrl ?? null,
        fileName: dto.fileName ?? null,
        linkUrl: dto.linkUrl ?? null,
        subjectId: dto.subjectId ?? null,
        topicId: dto.topicId ?? null,
        subtopicId: dto.subtopicId ?? null,
        examLevelId: dto.examLevelId ?? null,
        batches: (dto.batchIds ?? []).map((id) => ({ id }) as Batch),
        status: dto.status ?? ContentStatus.Draft,
        createdBy: actorId,
        updatedBy: actorId,
      }),
    );

    return this.read(saved.id, { userId: actorId, isStaff: true });
  }

  async findAll(query: FindContentQueryDto, viewer: Viewer) {
    const { page, limit } = query;

    const qb = this.baseQuery();

    if (query.search) {
      // Title only, per P2-5 - the console's search box is documented as
      // matching the title, and widening it here would return rows the user
      // cannot see a reason for.
      qb.andWhere('content.title ILIKE :search', {
        search: `%${query.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
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
    if (query.examLevelId) {
      qb.andWhere('content.examLevelId = :examLevelId', {
        examLevelId: query.examLevelId,
      });
    }

    await this.applyVisibility(qb, query, viewer);

    const [records, total] = await qb
      // P2-5 asks for `uploadedAt DESC, id ASC`. `uploadedAt` is createdAt
      // rendered as a day, so ordering on createdAt gives the same sequence
      // with finer resolution inside a day.
      .orderBy('content.createdAt', 'DESC')
      .addOrderBy('content.id', 'ASC')
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
    const record = await this.load(id, viewer);

    // Below the 404 on purpose: an open is only an open once the reader was
    // actually allowed in. Never throws - see ContentViewsService.record().
    await this.contentViews.record(record, viewer);

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
    const merged = <T>(sent: T | undefined, stored: T): T =>
      sent !== undefined ? sent : stored;

    const subjectId = merged(dto.subjectId, record.subjectId);
    const topicId = merged(dto.topicId, record.topicId);
    const subtopicId = merged(dto.subtopicId, record.subtopicId);
    await this.assertTaxonomy(subjectId, topicId, subtopicId);

    const examLevelId = merged(dto.examLevelId, record.examLevelId);
    if (dto.examLevelId !== undefined) {
      await this.assertExamLevelExists(examLevelId);
    }

    const fileUrl = merged(dto.fileUrl, record.fileUrl);
    const linkUrl = merged(dto.linkUrl, record.linkUrl);
    this.assertExactlyOneSource(fileUrl, linkUrl);

    if (dto.batchIds !== undefined) {
      await this.assertBatchesExist(dto.batchIds);
      record.batches = dto.batchIds.map(
        (batchId) => ({ id: batchId }) as Batch,
      );
    }

    if (dto.title !== undefined) record.title = dto.title;
    if (dto.description !== undefined) record.description = dto.description;
    if (dto.type !== undefined) record.type = dto.type;
    if (dto.fileName !== undefined) record.fileName = dto.fileName;
    if (dto.status !== undefined) record.status = dto.status;
    record.subjectId = subjectId;
    record.topicId = topicId;
    record.subtopicId = subtopicId;
    record.examLevelId = examLevelId;
    record.fileUrl = fileUrl;
    record.linkUrl = linkUrl;
    record.updatedBy = actorId;

    await this.content.save(record);

    return this.read(id, { userId: actorId, isStaff: true });
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
   * One item, presented - without recording a view.
   *
   * `create` and `update` re-read through this rather than `findOne` so that
   * saving an item never logs its author as having opened it.
   */
  private async read(id: number, viewer: Viewer) {
    return this.present(await this.load(id, viewer));
  }

  private async load(id: number, viewer: Viewer): Promise<Content> {
    const qb = this.baseQuery().andWhere('content.id = :id', { id });
    await this.applyVisibility(qb, {}, viewer);

    const record = await qb.getOne();
    // A draft, or another batch's material, is 404 rather than 403: a
    // student should not learn an item exists by being refused it.
    if (!record) throw new NotFoundException('Content not found');
    return record;
  }

  private baseQuery(): SelectQueryBuilder<Content> {
    return (
      this.content
        .createQueryBuilder('content')
        .leftJoinAndSelect('content.subject', 'subject')
        .leftJoinAndSelect('content.topic', 'topic')
        .leftJoinAndSelect('content.subtopic', 'subtopic')
        .leftJoinAndSelect('content.examLevel', 'examLevel')
        // leftJoin rather than an inner join used as a filter: the batch
        // filter is an EXISTS, so this one keeps every attached batch on the
        // row instead of returning only the batch that matched.
        .leftJoinAndSelect('content.batches', 'batch')
    );
  }

  /**
   * Narrows a query to what the caller may see.
   *
   * Staff see everything and may filter by status either way. A student sees
   * published items only, and among those only the ones attached to no batch
   * at all - the library's shared shelf - or attached to the batch they are
   * in.
   *
   * Both branches are EXISTS subqueries rather than joins, so that adding
   * this filter never changes which batches come back on a row.
   */
  private async applyVisibility(
    qb: SelectQueryBuilder<Content>,
    query: { batchId?: number; status?: ContentStatus },
    viewer: Viewer,
  ) {
    const attachedToAny =
      'SELECT 1 FROM content_batches cb WHERE cb.content_id = content.id';

    if (viewer.isStaff) {
      if (query.status !== undefined) {
        qb.andWhere('content.status = :status', { status: query.status });
      }
      if (query.batchId) {
        qb.andWhere(
          `EXISTS (${attachedToAny} AND cb.batch_id = :filterBatchId)`,
          { filterBatchId: query.batchId },
        );
      }
      return;
    }

    qb.andWhere('content.status = :publishedStatus', {
      publishedStatus: ContentStatus.Published,
    });

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
    linkUrl: string | null,
  ) {
    if (fileUrl && linkUrl) {
      throw new BadRequestException('Send either fileUrl or linkUrl, not both');
    }
    if (!fileUrl && !linkUrl) {
      throw new BadRequestException('Either fileUrl or linkUrl is required');
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

  private async assertExamLevelExists(examLevelId: number | null) {
    if (examLevelId === null) return;

    const exists = await this.examLevels.existsBy({
      id: examLevelId,
      deletedAt: IsNull(),
    });
    if (!exists) {
      throw new NotFoundException(
        `Exam level with ID ${examLevelId} not found`,
      );
    }
  }

  /**
   * Validates the item's place in the academic hierarchy.
   *
   * The same three rules `QuestionsService.assertTaxonomy` applies, kept
   * deliberately identical so a subject/topic/subtopic tag means the same
   * thing on a question and on a library item. Duplicated rather than shared
   * because that file belongs to the other developer's track - see CLAUDE.md
   * section 3. Worth extracting to `common/` once both sides agree.
   *
   *   1. No gaps - a topic needs a subject, a subtopic needs a topic. A tag
   *      hanging off nothing cannot be rolled up by subject later.
   *   2. Each id exists and is not soft-deleted (404).
   *   3. Each id belongs to the one above it (400).
   */
  private async assertTaxonomy(
    subjectId: number | null,
    topicId: number | null,
    subtopicId: number | null,
  ) {
    if (topicId !== null && subjectId === null) {
      throw new BadRequestException(
        'subjectId is required when topicId is set',
      );
    }
    if (subtopicId !== null && topicId === null) {
      throw new BadRequestException(
        'topicId is required when subtopicId is set',
      );
    }

    if (subjectId !== null) {
      const exists = await this.subjects.existsBy({
        id: subjectId,
        deletedAt: IsNull(),
      });
      if (!exists) {
        throw new NotFoundException(`Subject with ID ${subjectId} not found`);
      }
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

  /**
   * The P2-5 shape, plus the resolved names beside each id.
   *
   * The ids are what P2-5 specifies and what a PATCH sends back. The nested
   * `subject` / `topic` / `examLevel` / `batches` objects are extras a
   * client may ignore - they save the console a second round trip to render
   * the Linked Batches chips and the subject column.
   */
  private present(record: Content) {
    const named = (row?: { id: number; name: string } | null) =>
      row ? { id: row.id, name: row.name } : null;

    // Name-sorted, matching how the faculty row presents its batches.
    const batches = (record.batches ?? [])
      .map((batch) => ({ id: batch.id, name: batch.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      id: record.id,
      title: record.title,
      description: record.description,
      type: record.type,
      fileUrl: record.fileUrl,
      fileName: record.fileName,
      linkUrl: record.linkUrl,
      subjectId: record.subjectId,
      topicId: record.topicId,
      subtopicId: record.subtopicId,
      examLevelId: record.examLevelId,
      batchIds: batches.map((batch) => batch.id),
      status: record.status,
      uploadedAt: ContentService.asDay(record.createdAt),
      subject: named(record.subject),
      topic: named(record.topic),
      subtopic: named(record.subtopic),
      examLevel: named(record.examLevel),
      batches,
      createdBy: record.createdBy,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * `2026-09-12` - the day an item was added, never a timestamp.
   *
   * P2-5 is explicit that the column renders a day with no time, and that a
   * timestamp would shift the date for anyone west of UTC. Bucketed in the
   * same zone the activity charts use, so "added on the 12th" means the same
   * thing on every screen. en-CA because its short format is already
   * ISO-ordered, the trick ActivityService.today() uses.
   */
  private static asDay(at: Date | null): string | null {
    if (!at) return null;
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: process.env.ACTIVITY_TIMEZONE ?? 'Asia/Kolkata',
    }).format(at);
  }
}
