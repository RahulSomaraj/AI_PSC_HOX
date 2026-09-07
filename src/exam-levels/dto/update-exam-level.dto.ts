import { PartialType } from '@nestjs/swagger';
import { CreateExamLevelDto } from './create-exam-level.dto';

/**
 * Every field optional. The audit columns are deliberately absent:
 * `updatedBy` is taken from the JWT in the controller, never from the body.
 *
 * Nothing to reparent here - a level sits at the root of the hierarchy. The
 * service still re-checks the name before saving, so a rename onto a taken
 * name is reported as 409 rather than surfacing as a unique-index violation.
 */
export class UpdateExamLevelDto extends PartialType(CreateExamLevelDto) {}
