<<<<<<< HEAD
import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTopicDto } from './create-topic.dto';

/**
 * `subjectId` is left out on purpose - moving a topic to another subject
 * would silently invalidate every syllabus item that maps it together with
 * its old subject.
 */
export class UpdateTopicDto extends PartialType(
  OmitType(CreateTopicDto, ['subjectId'] as const),
) {}
=======
import { PartialType } from '@nestjs/swagger';
import { CreateTopicDto } from './create-topic.dto';

/**
 * Every field optional, `subjectId` included: a topic filed under the wrong
 * subject can be reparented. The service validates the incoming subject and
 * re-checks the name against the new parent before saving, so a collision is
 * reported as 409 rather than surfacing as a unique-index violation.
 *
 * The audit columns are absent by design - `updatedBy` comes from the JWT.
 */
export class UpdateTopicDto extends PartialType(CreateTopicDto) {}
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
