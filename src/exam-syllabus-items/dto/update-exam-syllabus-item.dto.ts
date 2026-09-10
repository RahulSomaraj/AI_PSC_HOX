import { PartialType } from '@nestjs/swagger';
import { CreateExamSyllabusItemDto } from './create-exam-syllabus-item.dto';

/**
 * Every field optional, `syllabusId` included: an item added to the wrong
 * syllabus can be moved, the same way a stage can be refiled under another
 * post.
 *
 * Editing the mapping is the path that needs care, because the three ids
 * decide which of the table's three unique indexes governs the row:
 *
 *   subject only              -> UQ_exam_syllabus_items_subject
 *   subject + topic           -> UQ_exam_syllabus_items_topic
 *   subject + topic + subtopic -> UQ_exam_syllabus_items_subtopic
 *
 * So clearing subtopicId does not merely blank a column - it moves the row
 * from the third index to the second, where it may now collide with an item
 * that was already mapping that topic. The service resolves the effective
 * triple against the stored row, re-checks the hierarchy, and re-checks
 * uniqueness at the resulting depth, reporting a collision as 409.
 *
 * Send null to clear topicId or subtopicId. Clearing topicId while
 * subtopicId is still set is refused - a subtopic needs its topic.
 *
 * There are no audit columns to omit: this table carries only createdAt.
 */
export class UpdateExamSyllabusItemDto extends PartialType(
  CreateExamSyllabusItemDto,
) {}
