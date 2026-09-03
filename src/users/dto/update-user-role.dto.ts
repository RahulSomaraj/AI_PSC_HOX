import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../common/enums/role.enum';

export class UpdateUserRoleDto {
  @ApiProperty({
    description: 'Role to assign to the user',
    enum: Role,
    example: Role.Admin,
  })
  @IsEnum(Role, { message: 'Role must be one of: user, admin' })
  role: Role;
}
