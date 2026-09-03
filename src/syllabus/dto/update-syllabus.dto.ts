import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSyllabusDto } from './create-syllabus.dto';

/**
 * The exam and the stage are fixed once the syllabus exists - its items are
 * validated against them.
 */
export class UpdateSyllabusDto extends PartialType(
  OmitType(CreateSyllabusDto, ['examId', 'examStageId'] as const),
) {}
