import { PartialType } from '@nestjs/mapped-types';
import { CreateCourseDto } from './create-course.dto';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCourseDto extends PartialType(CreateCourseDto) {
  @ApiPropertyOptional({
    description: 'Email or username of the user updating the course',
    example: 'admin@example.com',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  updatedBy?: string;
}
