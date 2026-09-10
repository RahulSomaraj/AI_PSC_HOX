import { PartialType } from '@nestjs/swagger';
import { CreateExamSyllabusDto } from './create-exam-syllabus.dto';

/**
 * Every field optional, both ids included: a syllabus created against the
 * wrong stage can be moved, the same way an exam post can be refiled under
 * another level. It is a classification that can simply be wrong, not a
 * record of something that happened.
 *
 * Moving one is the most heavily checked path in this module, because three
 * separate rules bear on it and the service resolves all of them against the
 * effective pair rather than the request:
 *
 *   - the new stage exists and is live (404)
 *   - examPostId is the post that owns that stage (400)
 *   - the new stage has no live syllabus already (409)
 *
 * The last one is why moving a syllabus onto an occupied stage fails rather
 * than quietly displacing what was there.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
 */
export class UpdateExamSyllabusDto extends PartialType(
  CreateExamSyllabusDto,
) {}
