import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean } from 'class-validator';

export class FacultyStatusDto {
  @ApiProperty({ example: false })
  @Transform(({ obj, key }) => obj[key])
  @IsBoolean()
  isActive: boolean;
}
