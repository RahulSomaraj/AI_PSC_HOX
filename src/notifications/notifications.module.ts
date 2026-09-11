import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { Batch } from '../batches/entities/batch.entity';
import { AspirantProfile } from '../aspirant-profiles/entities/aspirant-profile.entity';

/**
 * Admin announcements, and the student's view of them.
 *
 * Three entities, of which only one is its own:
 *   Notification   - the announcements
 *   Batch          - checked on write, so a bad batch id is a 404
 *   AspirantProfile - where a student's batch actually lives
 *
 * Entities rather than the sibling modules, following AnswerLogModule: this
 * needs two tables, not two services, and importing BatchesModule here would
 * couple the two for nothing.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Notification, Batch, AspirantProfile])],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
