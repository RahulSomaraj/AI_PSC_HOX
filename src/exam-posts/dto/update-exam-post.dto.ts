import { PartialType } from '@nestjs/swagger';
import { CreateExamPostDto } from './create-exam-post.dto';

/**
 * Every field optional, `examLevelId` included: a post filed under the wrong
 * level can be reparented. The service validates the incoming level and
 * re-checks the name against the new parent before saving, so a collision is
 * reported as 409 rather than surfacing as a unique-index violation.
 *
 * Reparenting is allowed here, unlike the userId on a subscription: a post's
 * level is a classification that can simply be wrong, not a record of what
 * happened. Moving it corrects the catalog rather than rewriting history.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
 */
export class UpdateExamPostDto extends PartialType(CreateExamPostDto) {}
