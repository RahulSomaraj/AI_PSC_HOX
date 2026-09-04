import { PartialType } from '@nestjs/swagger';
import { CreateSubjectDto } from './create-subject.dto';

/**
 * Every field optional. The audit columns are deliberately absent:
 * `updatedBy` is taken from the JWT in the controller, never from the body.
 */
export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}
