import { ApiProperty } from '@nestjs/swagger';

export class NotificationDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({ example: 'Friday class moved to 4 PM' })
  title: string;

  @ApiProperty({
    example:
      'This week only, the Friday revision class starts at 4 PM instead of 2 PM.',
  })
  body: string;

  @ApiProperty({
    nullable: true,
    example: 3,
    description: 'The batch it was sent to, or null if it went to everyone.',
  })
  batchId: number | null;

  @ApiProperty({ example: '2026-09-11T10:35:00.000Z' })
  createdAt: Date;
}
