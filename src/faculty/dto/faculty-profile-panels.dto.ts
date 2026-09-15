import { ApiProperty } from '@nestjs/swagger';
import { BatchMode } from '../../common/enums/batch-mode.enum';

/** A row of the faculty profile's Subjects panel. */
export class FacultySubjectDto {
  @ApiProperty({ example: 1 })
  subjectId: number;

  @ApiProperty({ example: 'Indian Polity' })
  name: string;

  @ApiProperty({ example: 12, description: 'Live topics under the subject.' })
  topicCount: number;
}

/** A row of the faculty profile's Batches Assigned panel. */
export class FacultyBatchDto {
  @ApiProperty({ example: 3 })
  id: number;

  @ApiProperty({ example: 'LDC Evening 2026' })
  name: string;

  @ApiProperty({
    example: 'LDC (10th Level)',
    description:
      'The exam the batch targets and its level, as "Exam (Level)". Short name when the exam has one.',
  })
  examLevel: string;

  @ApiProperty({ enum: BatchMode, example: BatchMode.Online })
  mode: BatchMode;

  @ApiProperty({ example: 42 })
  studentCount: number;
}
