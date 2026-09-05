import { OmitType, PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateSubscriptionDto } from './create-subscription.dto';

/**
 * Every field optional, with two departures from CreateSubscriptionDto.
 *
 * `userId` is omitted: a subscription is a record of what one user paid for,
 * and moving it to another user would rewrite both users' history rather
 * than correct anything. A subscription filed against the wrong user gets
 * deleted and re-created. The global pipe runs forbidNonWhitelisted, so a
 * PATCH carrying userId fails with 400 instead of being silently dropped.
 *
 * `cancelledAt` is added: it is the only way to cancel a running
 * subscription through admin CRUD. It accepts null so a cancellation made in
 * error can be lifted - @IsOptional() skips validation for both null and
 * undefined, and the service tells the two apart before writing.
 *
 * The audit columns stay absent - `updatedBy` comes from the JWT.
 */
export class UpdateSubscriptionDto extends PartialType(
  OmitType(CreateSubscriptionDto, ['userId'] as const),
) {
  @ApiPropertyOptional({
    description:
      'When the subscription was cancelled (ISO 8601). Send null to lift a ' +
      'cancellation made in error. Setting this makes the subscription ' +
      'inactive immediately, whatever expiresAt says.',
    example: '2026-06-30T00:00:00Z',
    nullable: true,
  })
  @IsOptional()
  @IsDateString(
    { strict: false },
    { message: 'cancelledAt must be a valid ISO 8601 date or null' },
  )
  cancelledAt?: string | null;
}
