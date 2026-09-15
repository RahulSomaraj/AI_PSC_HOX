import { ApiProperty } from '@nestjs/swagger';
import {
  ALL_STUDENTS,
  NotificationChannel,
  NotificationLanguage,
  NotificationStatus,
} from '../notification-fields.enum';

/** A notification in the console's AdminNotification shape. */
export class NotificationDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Friday class moved to 4 PM' })
  title: string;

  @ApiProperty({
    example:
      'This week only, the Friday revision class starts at 4 PM instead of 2 PM.',
  })
  message: string;

  @ApiProperty({
    enum: NotificationChannel,
    example: NotificationChannel.AppPush,
    description: 'Always app-push until an SMS or email sender exists.',
  })
  channel: NotificationChannel;

  @ApiProperty({
    example: 'LDC Evening 2026',
    description: `The batch name it went to, or "${ALL_STUDENTS}".`,
  })
  target: string;

  @ApiProperty({
    enum: NotificationLanguage,
    example: NotificationLanguage.English,
  })
  language: NotificationLanguage;

  @ApiProperty({ example: '2026-09-11T10:35:00.000Z', description: 'ISO.' })
  sentAt: string;

  @ApiProperty({
    enum: NotificationStatus,
    example: NotificationStatus.Sent,
    description: 'Always sent until a sender exists that can fail.',
  })
  status: NotificationStatus;

  @ApiProperty({
    nullable: true,
    example: 3,
    description:
      'Beyond the console type: the batch id `target` names, or null for everyone.',
  })
  batchId: number | null;
}
