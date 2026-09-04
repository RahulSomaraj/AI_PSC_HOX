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
import { Role } from '../../common/enums/role.enum';

export enum UserSortBy {
  CreatedAt = 'createdAt',
  FirstName = 'firstName',
  Email = 'email',
}

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

export class FindUsersQueryDto {
  @ApiPropertyOptional({
    description: 'Page number, 1-based',
    example: 1,
    default: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Rows per page',
    example: 10,
    default: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit must be at most 100' })
  limit?: number = 10;

  @ApiPropertyOptional({
    description:
      'Case-insensitive partial match on firstName, lastName or phone',
    example: 'joy',
  })
  @IsOptional()
  @IsString({ message: 'search must be a string' })
  @MaxLength(100, { message: 'search must be at most 100 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  search?: string;

  @ApiPropertyOptional({
    description: 'Filter by role - use "user" for the students list',
    enum: Role,
    example: Role.User,
  })
  @IsOptional()
  @IsEnum(Role, { message: 'role must be one of: user, admin' })
  role?: Role;

  @ApiPropertyOptional({
    description:
      'Filter by enrolled course - backs the "Target Exam" filter on the students screen',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'courseId must be an integer' })
  @Min(1, { message: 'courseId must be at least 1' })
  courseId?: number;

  @ApiPropertyOptional({
    description:
      'Filter by assigned batch - backs the "All Batches" filter on the students screen. Matches through the aspirant profile, so a student without one never matches.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'batchId must be an integer' })
  @Min(1, { message: 'batchId must be at least 1' })
  batchId?: number;

  @ApiPropertyOptional({
    description: 'Filter by account status',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isActive must be a boolean value' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    enum: UserSortBy,
    default: UserSortBy.CreatedAt,
  })
  @IsOptional()
  @IsEnum(UserSortBy, {
    message: 'sortBy must be one of: createdAt, firstName, email',
  })
  sortBy?: UserSortBy = UserSortBy.CreatedAt;

  @ApiPropertyOptional({
    description: 'Sort direction',
    enum: SortOrder,
    default: SortOrder.Desc,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(SortOrder, { message: 'sortOrder must be one of: ASC, DESC' })
  sortOrder?: SortOrder = SortOrder.Desc;
}
