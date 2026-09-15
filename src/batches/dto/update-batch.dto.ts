import { PartialType } from '@nestjs/swagger';
import { CreateBatchDto } from './create-batch.dto';

/**
 * Every field is editable, `targetExamId` included - nothing hangs off a
 * batch, so retargeting one at a different exam orphans nothing.
 */
export class UpdateBatchDto extends PartialType(CreateBatchDto) {}
