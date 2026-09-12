import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentView } from './entities/content-view.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';

/**
 * The item being opened. Structural rather than the `Content` entity so this
 * service never has to import from `content/` - `ContentModule` imports this
 * one, and a type import back would close the cycle.
 */
export interface ViewedItem {
  id: number;
  subjectId: number;
}

/** Who opened it, as `ContentService` already knows them. */
export interface Reader {
  userId: number;
  isStaff: boolean;
}

@Injectable()
export class ContentViewsService {
  private readonly logger = new Logger(ContentViewsService.name);

  constructor(
    @InjectRepository(ContentView)
    private readonly views: Repository<ContentView>,
    @InjectRepository(AspirantProfile)
    private readonly profiles: Repository<AspirantProfile>,
  ) {}

  /**
   * Records one open.
   *
   * **Never throws, and never rejects.** A view is telemetry: if this table
   * is unreachable, a student must still get their content. Every failure is
   * logged and swallowed, which is why the call site can be a single
   * unguarded line.
   *
   * One row per open, as specified - no dedup window. A student who reopens
   * the same PDF three times has read it three times, and answer_log counts
   * repeated practice on one question the same way. If refresh loops turn
   * out to inflate the figures, a throttle belongs here rather than at the
   * call site.
   */
  async record(item: ViewedItem, reader: Reader): Promise<void> {
    // Staff previews are not usage. An admin checking a PDF renders should
    // not move a number on the Content Usage tab, and "views per batch" has
    // no answer for someone who is in no batch.
    //
    // This also keeps ContentService.create() and update() out of the table:
    // both end by re-reading through findOne() with isStaff true. If this
    // check is ever relaxed, those two paths need their own guard or every
    // save will log a phantom view.
    if (reader.isStaff) return;

    try {
      // The reader's batch lives on their aspirant profile, not on the user
      // row - the same lookup the content visibility filter does.
      const profile = await this.profiles.findOne({
        where: { userId: reader.userId },
        select: { id: true, batchId: true },
      });

      // insert() rather than save(): this row is never updated, and save()
      // would issue a SELECT first to find out.
      await this.views.insert({
        contentId: item.id,
        userId: reader.userId,
        subjectId: item.subjectId,
        batchId: profile?.batchId ?? null,
      });
    } catch (error) {
      this.logger.warn(
        `Could not record a view of content ${item.id} by user ${reader.userId}: ${
          error instanceof Error ? error.message : error
        }`,
      );
    }
  }
}
