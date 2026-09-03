import { PartialType } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { CreateExamStageDto } from './create-exam-stage.dto';

/**
 * `examId` is left out on purpose - moving a stage to a different exam would
 * orphan the syllabus mapped to it. Delete and recreate the stage instead.
 */
export class UpdateExamStageDto extends PartialType(
  OmitType(CreateExamStageDto, ['examId'] as const),
) {}
