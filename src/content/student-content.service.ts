import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ContentView } from '../content-views/entities/content-view.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import { RecentContentDto } from './dto/recent-content.dto';

@Injectable()
export class StudentContentService {
  constructor(
    @InjectRepository(ContentView)
    private readonly views: Repository<ContentView>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
  ) {}

  /**
   * What a student has opened lately, newest first.
   *
   * Reads `content_view`, the table `GET /content/:id` writes. Rows only
   * exist from 2026-09-12, when that write shipped - there is nothing to
   * backfill from, because no earlier record of a content open exists.
   */
  async recentContent(userId: number, limit = 5): Promise<RecentContentDto[]> {
    await this.assertStudentExists(userId);

    const rows = await this.views
      .createQueryBuilder('view')
      // Inner join: an item that has since been soft-deleted drops out
      // rather than being listed as something the client cannot open.
      .innerJoin('view.content', 'content', 'content.deleted_at IS NULL')
      .select([
        'content.id AS "id"',
        'content.title AS "title"',
        'content.type AS "kind"',
        'view.viewed_at AS "viewedAt"',
      ])
      // Deliberately not filtered by status. This is history: an item that
      // was published when it was read stays in the record after it is
      // pulled back to draft. The panel is admin-facing, so a draft title is
      // nothing the reader should not see.
      .where('view.user_id = :userId', { userId })
      .orderBy('view.viewed_at', 'DESC')
      .addOrderBy('view.id', 'DESC')
      .limit(limit)
      .getRawMany<{
        id: number;
        title: string;
        kind: RecentContentDto['kind'];
        viewedAt: Date;
      }>();

    // One row per open, so reopening the same PDF twice appears twice -
    // matching how the table counts, and the panel is "recently viewed",
    // not "distinct items viewed".
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      kind: row.kind,
      viewedAt: new Date(row.viewedAt).toISOString(),
    }));
  }

  /**
   * 404 for an unknown id, a soft-deleted account, or one whose role is not
   * `user` - matching GET /users/:id, GET /users/:id/exams and the
   * Weak Subjects panel this one sits beside.
   */
  private async assertStudentExists(userId: number): Promise<void> {
    const exists = await this.users.exists({
      where: { id: userId, role: Role.User, deletedAt: IsNull() },
    });
    if (!exists) {
      throw new NotFoundException(`Student with ID ${userId} not found`);
    }
  }
}
