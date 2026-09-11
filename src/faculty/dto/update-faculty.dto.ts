import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateFacultyDto } from './create-faculty.dto';

// Password changes use the existing authentication endpoints.
export class UpdateFacultyDto extends PartialType(
  OmitType(CreateFacultyDto, ['password'] as const),
  { skipNullProperties: false },
) {}
