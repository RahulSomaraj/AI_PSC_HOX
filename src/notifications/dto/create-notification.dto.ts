import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import {
  ALL_STUDENTS,
  NotificationLanguage,
} from '../notification-fields.enum';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** What the console's notification composer sends. */
export class CreateNotificationDto {
  @ApiProperty({ example: 'Friday class moved to 4 PM' })
  @IsString()
  @MinLength(1, { message: 'A title is required' })
  @MaxLength(200)
  @Transform(trim)
  title: string;

  @ApiProperty({
    enum: NotificationLanguage,
    example: NotificationLanguage.English,
  })
  @IsEnum(NotificationLanguage, { message: 'Choose a language' })
  language: NotificationLanguage;

  @ApiProperty({
    example:
      'This week only, the Friday revision class starts at 4 PM instead of 2 PM.',
  })
  @IsString()
  @MaxLength(5000)
  @Transform(trim)
  message: string;

  @ApiProperty({
    example: ALL_STUDENTS,
    description: `Who it goes to: "${ALL_STUDENTS}", or the exact name of a live batch. A batch name that does not exist is a 404.`,
  })
  @IsString()
  @MinLength(1, { message: 'Choose who this goes to' })
  @MaxLength(200)
  @Transform(trim)
  target: string;
}
