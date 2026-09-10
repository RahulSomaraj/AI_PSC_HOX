import { PartialType } from '@nestjs/swagger';
import { CreateSubjectDto } from './create-subject.dto';

<<<<<<< HEAD
=======
/**
 * Every field optional. The audit columns are deliberately absent:
 * `updatedBy` is taken from the JWT in the controller, never from the body.
 */
>>>>>>> c934900d1070174de7aa27569b9d7632cebf13c1
export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {}
