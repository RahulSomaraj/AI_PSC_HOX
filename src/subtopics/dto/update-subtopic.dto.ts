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
