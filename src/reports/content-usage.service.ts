import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { ContentView } from '../content-views/entities/content-view.entity';
import {
  ContentUsageByBatchDto,
  ContentUsageBySubjectDto,
  ContentUsageDto,
  ContentUsageItemDto,
  ContentUsagePointDto,
  ContentUsageSummaryDto,
} from './dto/content-usage.dto';
import { ContentUsageQueryDto } from './dto/content-usage-query.dto';

/** How many rows the two breakdowns return. They are read as a chart legend. */
const BREAKDOWN_LIMIT = 20;

const VIEWS = 'COUNT(*)';
const VIEWERS = 'COUNT(DISTINCT view.user_id)';

interface SummaryRow {
  totalViews: string;
  distinctViewers: string;
  itemsViewed: string;
}

interface SeriesRow {
  date: string;
  views: string;
}

interface SubjectRow {
  subjectId: number | null;
  subjectName: string | null;
  views: string;
  distinctViewers: string;
}

interface BatchRow {
  batchId: number | null;
  batchName: string | null;
  views: string;
  distinctViewers: string;
}

interface ItemRow {
  contentId: number;
  title: string;
  type: string;
  subjectId: number | null;
  subjectName: string | null;
  views: string;
  distinctViewers: string;
  lastViewedAt: Date;
}

@Injectable()
export class ContentUsageService {
  private readonly logger = new Logger(ContentUsageService.name);

  /** Same zone as every other chart, so the day boundaries line up. */
  private readonly timeZone: string;

  constructor(
    @InjectRepository(ContentView)
    private readonly viewRepository: Repository<ContentView>,
    configService: ConfigService,
  ) {
    this.timeZone =
      configService.get<string>('ACTIVITY_TIMEZONE') ?? 'Asia/Kolkata';
  }

  /**
   * What students are actually reading: totals, a daily series, breakdowns by
   * subject and by batch, and the most-opened items.
   *
   * Everything reads `content_view` alone, except the item table which joins
   * `content` for a title. `subject_id` and `batch_id` are denormalised onto
   * each row at write time, so neither breakdown has to join back.
   *
   * Two things the numbers do not include, both decided at the write site:
   * staff opens, and any dedup - reopening an item three times is three
   * views. See API_CONTRACT.md, Content Library -> view tracking.
   */
  async report(query: ContentUsageQueryDto): Promise<ContentUsageDto> {
    const days = query.days ?? 30;
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;

    try {
      const to = this.today();
      const from = this.shiftDate(to, -(days - 1));

      const [summary, series, bySubject, byBatch, total, items] =
        await Promise.all([
          this.summary(query, from, to),
          this.series(query, from, to, days),
          this.bySubject(query, from, to),
          this.byBatch(query, from, to),
          this.countItems(query, from, to),
          this.items(query, from, to, page, limit),
        ]);

      return {
        summary,
        series,
        bySubject,
        byBatch,
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(
        `Failed to build content usage: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException('Failed to load content usage');
    }
  }

  private async summary(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
  ): Promise<ContentUsageSummaryDto> {
    const row = await this.baseQuery(query, from, to)
      .select(VIEWS, 'totalViews')
      .addSelect(VIEWERS, 'distinctViewers')
      .addSelect('COUNT(DISTINCT view.content_id)', 'itemsViewed')
      .getRawOne<SummaryRow>();

    const totalViews = Number(row?.totalViews ?? 0);
    const days = this.dayCount(from, to);

    return {
      totalViews,
      distinctViewers: Number(row?.distinctViewers ?? 0),
      itemsViewed: Number(row?.itemsViewed ?? 0),
      // Divided by every day in the window, including the silent ones - an
      // average over only the busy days would flatter a quiet month.
      averageDailyViews: Math.round((totalViews / days) * 10) / 10,
    };
  }

  /** Gap-filled and oldest first, matching the dashboard and growth charts. */
  private async series(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
    days: number,
  ): Promise<ContentUsagePointDto[]> {
    const rows = await this.baseQuery(query, from, to)
      .select(`TO_CHAR(${this.localDate()}, 'YYYY-MM-DD')`, 'date')
      .addSelect(VIEWS, 'views')
      .groupBy(this.localDate())
      .getRawMany<SeriesRow>();

    const byDate = new Map(rows.map((row) => [row.date, Number(row.views)]));

    const series: ContentUsagePointDto[] = [];
    for (let offset = days - 1; offset >= 0; offset--) {
      const date = this.shiftDate(to, -offset);
      series.push({ date, views: byDate.get(date) ?? 0 });
    }
    return series;
  }

  private async bySubject(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
  ): Promise<ContentUsageBySubjectDto[]> {
    const rows = await this.baseQuery(query, from, to)
      // Left join, and no filter on deleted_at: the subject id is
      // denormalised and carries no foreign key, so a retired subject still
      // has to report the reading that happened under it.
      .leftJoin('subjects', 'subject', 'subject.id = view.subject_id')
      .select('view.subject_id', 'subjectId')
      .addSelect('subject.name', 'subjectName')
      .addSelect(VIEWS, 'views')
      .addSelect(VIEWERS, 'distinctViewers')
      .groupBy('view.subject_id')
      .addGroupBy('subject.name')
      .orderBy(VIEWS, 'DESC')
      .addOrderBy('view.subject_id', 'ASC', 'NULLS LAST')
      .limit(BREAKDOWN_LIMIT)
      .getRawMany<SubjectRow>();

    return rows.map((row) => ({
      subjectId: row.subjectId === null ? null : Number(row.subjectId),
      subjectName: row.subjectName,
      views: Number(row.views),
      distinctViewers: Number(row.distinctViewers),
    }));
  }

  private async byBatch(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
  ): Promise<ContentUsageByBatchDto[]> {
    const rows = await this.baseQuery(query, from, to)
      .leftJoin('batches', 'batch', 'batch.id = view.batch_id')
      .select('view.batch_id', 'batchId')
      .addSelect('batch.name', 'batchName')
      .addSelect(VIEWS, 'views')
      .addSelect(VIEWERS, 'distinctViewers')
      .groupBy('view.batch_id')
      .addGroupBy('batch.name')
      .orderBy(VIEWS, 'DESC')
      .addOrderBy('view.batch_id', 'ASC', 'NULLS LAST')
      .limit(BREAKDOWN_LIMIT)
      .getRawMany<BatchRow>();

    return rows.map((row) => ({
      batchId: row.batchId === null ? null : Number(row.batchId),
      batchName: row.batchName,
      views: Number(row.views),
      distinctViewers: Number(row.distinctViewers),
    }));
  }

  private countItems(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
  ): Promise<number> {
    return this.baseQuery(query, from, to)
      .select('COUNT(DISTINCT view.content_id)', 'count')
      .getRawOne<{ count: string }>()
      .then((row) => Number(row?.count ?? 0));
  }

  private async items(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
    page: number,
    limit: number,
  ): Promise<ContentUsageItemDto[]> {
    const rows = await this.baseQuery(query, from, to)
      // Inner join is safe: content_id is RESTRICT, so the row cannot have
      // been hard-deleted. Soft-deleted items are deliberately *not*
      // excluded - they were read, and retiring an item afterwards does not
      // unmake that.
      .innerJoin('content', 'item', 'item.id = view.content_id')
      .leftJoin('subjects', 'subject', 'subject.id = view.subject_id')
      .select('view.content_id', 'contentId')
      .addSelect('item.title', 'title')
      .addSelect('item.type', 'type')
      .addSelect('view.subject_id', 'subjectId')
      .addSelect('subject.name', 'subjectName')
      .addSelect(VIEWS, 'views')
      .addSelect(VIEWERS, 'distinctViewers')
      .addSelect('MAX(view.viewed_at)', 'lastViewedAt')
      .groupBy('view.content_id')
      .addGroupBy('item.title')
      .addGroupBy('item.type')
      .addGroupBy('view.subject_id')
      .addGroupBy('subject.name')
      .orderBy(VIEWS, 'DESC')
      // Stable page boundaries: two items on the same count must not swap
      // between pages.
      .addOrderBy('view.content_id', 'ASC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getRawMany<ItemRow>();

    return rows.map((row) => ({
      contentId: Number(row.contentId),
      title: row.title,
      type: row.type,
      subjectId: row.subjectId === null ? null : Number(row.subjectId),
      subjectName: row.subjectName,
      views: Number(row.views),
      distinctViewers: Number(row.distinctViewers),
      lastViewedAt: row.lastViewedAt,
    }));
  }

  /**
   * The window and the two filters, shared by every query above.
   *
   * Built fresh per call rather than cloned: each caller hangs a different
   * select and a different GROUP BY off it, and one builder cannot carry
   * them all.
   */
  private baseQuery(
    query: ContentUsageQueryDto,
    from: string,
    to: string,
  ): SelectQueryBuilder<ContentView> {
    const builder = this.viewRepository
      .createQueryBuilder('view')
      .where(`${this.localDate()} BETWEEN :from AND :to`, { from, to })
      .setParameter('tz', this.timeZone);

    // The item's subject as it stood when it was read, not as it stands now.
    if (query.subjectId !== undefined) {
      builder.andWhere('view.subject_id = :subjectId', {
        subjectId: query.subjectId,
      });
    }

    // The reader's batch at the time, not the item's attached batches.
    if (query.batchId !== undefined) {
      builder.andWhere('view.batch_id = :batchId', { batchId: query.batchId });
    }

    return builder;
  }

  /**
   * `viewed_at` bucketed into a local calendar day.
   *
   * The zone is cast explicitly: a bare parameter beside AT TIME ZONE can
   * leave Postgres unable to infer the operand type.
   */
  private localDate(): string {
    return '(view.viewed_at AT TIME ZONE CAST(:tz AS text))::date';
  }

  private dayCount(from: string, to: string): number {
    const start = new Date(`${from}T00:00:00Z`).getTime();
    const end = new Date(`${to}T00:00:00Z`).getTime();
    return Math.round((end - start) / 86_400_000) + 1;
  }

  private today(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: this.timeZone,
    }).format(new Date());
  }

  private shiftDate(date: string, days: number): string {
    const shifted = new Date(`${date}T00:00:00Z`);
    shifted.setUTCDate(shifted.getUTCDate() + days);
    return shifted.toISOString().slice(0, 10);
  }
}
