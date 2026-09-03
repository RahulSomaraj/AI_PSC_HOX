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

export class ReorderExamStageItemDto {
  @ApiProperty({ description: 'ID of the stage to move', example: 2 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  id: number;

  @ApiProperty({ description: 'New position of the stage', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  stageOrder: number;
}

export class ReorderExamStagesDto {
  @ApiProperty({
    description: 'ID of the exam whose stages are being reordered',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examId: number;

  @ApiProperty({
    description: 'New ordering for the stages of the exam',
    type: [ReorderExamStageItemDto],
    example: [
      { id: 2, stageOrder: 1 },
      { id: 1, stageOrder: 2 },
    ],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderExamStageItemDto)
  items: ReorderExamStageItemDto[];
}
