import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderItemDto {
  @ApiProperty({ description: 'ID of the record to move', example: 3 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: 'New sort order (ascending)', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  sortOrder: number;
}

/**
 * Shared body for the reorder endpoints. Every id in `items` must belong to
 * the same parent, otherwise the whole request is rejected.
 */
export class ReorderDto {
  @ApiProperty({
    description: 'New ordering for the records',
    type: [ReorderItemDto],
    example: [
      { id: 3, sortOrder: 1 },
      { id: 1, sortOrder: 2 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderItemDto)
  items: ReorderItemDto[];
}
