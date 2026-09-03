import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateSyllabusItemDto } from './create-syllabus-item.dto';

/**
 * Only the weightage/ordering fields are editable. Pointing an existing item
 * at a different subject, topic or subtopic is a different mapping - remove
 * this one and add that one, so the duplicate checks still hold.
 */
export class UpdateSyllabusItemDto extends PartialType(
  OmitType(CreateSyllabusItemDto, [
    'subjectId',
    'topicId',
    'subtopicId',
  ] as const),
) {}
