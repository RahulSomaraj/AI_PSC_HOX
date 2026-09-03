import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * Shared body for the activate/deactivate endpoints of the exam and academic
 * master data.
 */
export class UpdateStatusDto {
  @ApiProperty({
    description: 'Whether the record should be active',
    example: false,
  })
  @IsNotEmpty()
  @IsBoolean()
  isActive: boolean;
}
