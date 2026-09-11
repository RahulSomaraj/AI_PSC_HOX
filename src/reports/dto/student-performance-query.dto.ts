import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum StudentPerformanceSortBy {
  Accuracy = 'accuracy',
  AverageScore = 'averageScore',
  ExamsTaken = 'examsTaken',
  Name = 'name',
}

export enum SortOrder {
  Asc = 'ASC',
  Desc = 'DESC',
}

/** Filtering, sorting and paging for the Student Performance tab. */
export class StudentPerformanceQueryDto {
  @ApiPropertyOptional({
    description: 'Only students assigned to this batch.',
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'batchId must be an integer' })
  @Min(1, { message: 'batchId must be at least 1' })
  batchId?: number;

  @ApiPropertyOptional({
    description: 'Case-insensitive match on name or email.',
    example: 'anjali',
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @ApiPropertyOptional({
    enum: StudentPerformanceSortBy,
    default: StudentPerformanceSortBy.Accuracy,
  })
  @IsOptional()
  @IsEnum(StudentPerformanceSortBy, {
    message: 'sortBy must be one of: accuracy, averageScore, examsTaken, name',
  })
  sortBy?: StudentPerformanceSortBy;

  @ApiPropertyOptional({ enum: SortOrder, default: SortOrder.Desc })
  @IsOptional()
  @IsEnum(SortOrder, { message: 'sortOrder must be ASC or DESC' })
  sortOrder?: SortOrder;

  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'page must be an integer' })
  @Min(1, { message: 'page must be at least 1' })
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25, example: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit must be an integer' })
  @Min(1, { message: 'limit must be at least 1' })
  @Max(100, { message: 'limit may not exceed 100' })
  limit?: number;
}
