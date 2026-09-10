import { PartialType } from '@nestjs/swagger';
import { CreateBatchDto } from './create-batch.dto';

/**
<<<<<<< HEAD
 * Every field is editable, `examId` included - nothing hangs off a batch, so
 * retargeting one at a different exam orphans nothing.
=======
 * Every field optional. Both halves of the unique key - `name` and `shift` -
 * are editable, so the service resolves the effective pair before checking
 * for a collision and reports 409 rather than letting the unique index
 * surface as a 500.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
 */
export class UpdateBatchDto extends PartialType(CreateBatchDto) {}
