import { Transform, Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({
    description:
      'ID of the user this subscription belongs to. Must be a live user - ' +
      'the service rejects an unknown or soft-deleted id with 404.',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'userId is required' })
  @Type(() => Number)
  @IsInt({ message: 'userId must be a number' })
  userId: number;

  @ApiProperty({
    description: 'Name of the plan being subscribed to',
    example: 'Premium',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Plan name is required' })
  @MaxLength(100, { message: 'Plan name must be at most 100 characters' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  planName: string;

  @ApiProperty({
    description: 'When the subscription term begins (ISO 8601)',
    example: '2026-01-01T00:00:00Z',
  })
  @IsNotEmpty({ message: 'Start date is required' })
  @IsDateString(
    { strict: false },
    { message: 'startDate must be a valid ISO 8601 date' },
  )
  startDate: string;

  @ApiProperty({
    description:
      'When the subscription term ends (ISO 8601). Must be after startDate.',
    example: '2027-01-01T00:00:00Z',
  })
  @IsNotEmpty({ message: 'Expiry date is required' })
  @IsDateString(
    { strict: false },
    { message: 'expiresAt must be a valid ISO 8601 date' },
  )
  expiresAt: string;

  // cancelledAt is absent by design - a subscription cannot be created
  // already cancelled. It is set through UpdateSubscriptionDto.
  //
  // So are the audit columns; createdBy comes from the JWT.
}
