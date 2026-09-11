import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateUserDto } from '../../users/dto/create-user.dto';
import { FacultyRole } from '../faculty-role.enum';

export class CreateFacultyDto extends OmitType(CreateUserDto, [
  'isActive',
] as const) {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  firstName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lastName: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId: number;

  @ApiProperty({ enum: FacultyRole, example: FacultyRole.Teacher })
  @IsEnum(FacultyRole)
  role: FacultyRole;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description:
      'Assigned batch IDs; an empty array clears assignments on update.',
  })
  @ValidateIf((_object, value) => value !== undefined)
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(100)
  @IsInt({ each: true })
  @Min(1, { each: true })
  batchIds?: number[];

  @ApiPropertyOptional({ default: true, example: true })
  @ValidateIf((_object, value) => value !== undefined)
  // Read the original input: global implicit conversion turns "false" into true.
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  isActive?: boolean;
}
