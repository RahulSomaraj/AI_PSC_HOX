import { ApiProperty } from '@nestjs/swagger';
import { FacultyRole } from '../../faculty/faculty-role.enum';

export class RoleOptionDto {
  @ApiProperty({
    enum: FacultyRole,
    example: FacultyRole.ContentCreator,
    description: 'The value stored on a faculty record.',
  })
  value: FacultyRole;

  @ApiProperty({
    example: 'Content Creator',
    description: 'What to show in a dropdown or a table cell.',
  })
  label: string;
}
