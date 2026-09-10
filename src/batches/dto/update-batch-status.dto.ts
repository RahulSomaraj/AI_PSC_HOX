import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { BatchStatus } from '../../common/enums/batch-status.enum';

/**
 * Body for `PATCH /batches/:id/status`. The shared UpdateStatusDto does not
 * fit here: a batch carries a four-value status, not an isActive boolean.
 */
export class UpdateBatchStatusDto {
  @ApiProperty({
    description: 'New status of the batch',
    enum: BatchStatus,
    example: BatchStatus.Active,
  })
  @IsNotEmpty()
  @IsEnum(BatchStatus)
  status: BatchStatus;
}
