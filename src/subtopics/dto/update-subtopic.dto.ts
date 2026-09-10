<<<<<<< HEAD
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSubtopicDto } from './create-subtopic.dto';

/**
 * `topicId` is left out on purpose - moving a subtopic to another topic
 * would silently invalidate every syllabus item that maps it together with
 * its old topic.
 */
export class UpdateSubtopicDto extends PartialType(
  OmitType(CreateSubtopicDto, ['topicId'] as const),
) {}
=======
import { PartialType } from '@nestjs/swagger';
import { CreateSubtopicDto } from './create-subtopic.dto';

/**
 * Every field optional, `topicId` included: a subtopic filed under the wrong
 * topic can be reparented. The service validates the incoming topic and
 * re-checks the name against the new parent before saving, so a collision is
 * reported as 409 rather than surfacing as a unique-index violation.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
 */
export class UpdateSubtopicDto extends PartialType(CreateSubtopicDto) {}
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
