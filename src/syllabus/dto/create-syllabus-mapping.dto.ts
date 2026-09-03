import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, Min } from 'class-validator';
import { CreateSyllabusItemDto } from './create-syllabus-item.dto';

/**
 * Maps academic content straight onto an exam stage. The syllabus of that
 * stage is created on the fly if it does not exist yet, so the admin UI can
 * go from "pick an exam and a stage" to "tick a subtopic" in one call.
 */
export class CreateSyllabusMappingDto extends CreateSyllabusItemDto {
  @ApiProperty({ description: 'ID of the exam', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examId: number;

  @ApiProperty({ description: 'ID of the exam stage', example: 1 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  examStageId: number;
}
