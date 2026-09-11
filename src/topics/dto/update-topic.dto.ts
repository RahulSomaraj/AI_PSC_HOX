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
