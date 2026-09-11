import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Friday class moved to 4 PM' })
  @IsString()
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  title: string;

  @ApiProperty({
    example:
      'This week only, the Friday revision class starts at 4 PM instead of 2 PM.',
  })
  @IsString()
  @MaxLength(5000)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  body: string;

  @ApiPropertyOptional({
    minimum: 1,
    description:
      'Send to one batch. Omit to send to every student. A batch that does not exist, or is deleted, is a 404.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  batchId?: number;
}
