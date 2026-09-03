import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  Min,
} from 'class-validator';
import { SyllabusPriority } from '../../common/enums/syllabus-priority.enum';

/**
 * Adds a subject, a topic or a subtopic to a syllabus. Send the subject
 * alone to map the whole subject, add `topicId` to narrow it to one topic,
 * add `subtopicId` as well to map a single subtopic.
 */
export class CreateSyllabusItemDto {
  @ApiProperty({ description: 'ID of the subject to map', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  subjectId: number;

  @ApiPropertyOptional({
    description: 'ID of the topic to map. Must belong to the subject.',
    example: 4,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  topicId?: number;

  @ApiPropertyOptional({
    description:
      'ID of the subtopic to map. Must belong to the topic, and `topicId` is then required.',
    example: 9,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  subtopicId?: number;

  @ApiPropertyOptional({
    description: 'How important the item is for this stage',
    enum: SyllabusPriority,
    example: SyllabusPriority.High,
    default: SyllabusPriority.Medium,
  })
  @IsOptional()
  @IsEnum(SyllabusPriority)
  priority?: SyllabusPriority;

  @ApiPropertyOptional({
    description: 'Marks this item is expected to carry in the stage',
    example: 12.5,
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  marksWeightage?: number;

  @ApiPropertyOptional({
    description: 'Number of questions this item is expected to carry',
    example: 10,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  questionWeightage?: number;

  @ApiPropertyOptional({
    description: 'Position of the item in the syllabus (ascending)',
    example: 1,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the item is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
