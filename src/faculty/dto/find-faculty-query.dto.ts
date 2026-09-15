import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { FacultyRole } from '../faculty-role.enum';

export class FindFacultyQueryDto {
  // No class default: paging is opt-in, so "page was not sent" has to stay
  // distinguishable from "page=1". The console fetches the whole list.
  @ApiPropertyOptional({
    minimum: 1,
    description:
      'Send to get one page back as { data, total, page, limit, totalPages }. Omit for the full array.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Rows per page when `page` is sent.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Search by full name, email, subject, batch or assigned batch exam name.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  subjectId?: number;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  batchId?: number;

  @ApiPropertyOptional({ enum: FacultyRole })
  @IsOptional()
  @IsEnum(FacultyRole)
  role?: FacultyRole;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'true = Active; false = Inactive; omit for all.',
  })
  @IsOptional()
  @Transform(({ obj, key }) => {
    const value = obj[key];
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
