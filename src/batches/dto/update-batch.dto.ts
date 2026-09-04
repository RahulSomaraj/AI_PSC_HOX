import { PartialType } from '@nestjs/swagger';
import { CreateBatchDto } from './create-batch.dto';

/**
 * Every field optional. Both halves of the unique key - `name` and `shift` -
 * are editable, so the service resolves the effective pair before checking
 * for a collision and reports 409 rather than letting the unique index
 * surface as a 500.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
 */
export class UpdateBatchDto extends PartialType(CreateBatchDto) {}
