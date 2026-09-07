import { PartialType } from '@nestjs/swagger';
import { CreateExamStageDto } from './create-exam-stage.dto';

/**
 * Every field optional, `examPostId` included: a stage created against the
 * wrong post can be reparented. The service validates the incoming post and
 * re-checks the name against the new parent before saving, so a collision is
 * reported as 409 rather than surfacing as a unique-index violation.
 *
 * Reordering a sequence is an ordinary PATCH of `stageOrder`. Nothing stops
 * two stages of a post sharing an order - the doc calls the order dynamic,
 * and an admin dragging stages into place passes through duplicate values
 * before settling.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
 */
export class UpdateExamStageDto extends PartialType(CreateExamStageDto) {}
