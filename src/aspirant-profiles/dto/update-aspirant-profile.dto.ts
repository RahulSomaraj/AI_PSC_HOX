import { ApiPropertyOptional, OmitType, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { CreateAspirantProfileDto } from './create-aspirant-profile.dto';

export class UpdateAspirantProfileDto extends PartialType(
  OmitType(CreateAspirantProfileDto, ['userId', 'createdBy'] as const),
) {
  @ApiPropertyOptional({
    description: 'ID of the user updating this profile',
    example: 1,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'updatedBy must be a number' })
  updatedBy?: number;
}
