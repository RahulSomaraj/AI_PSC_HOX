import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCourseDto {
  @ApiProperty({
    description: 'Name of the course',
    example: 'Geography Quiz',
    maxLength: 50,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  courseName: string;

  @ApiProperty({
    description: 'Unique course identifier',
    example: 'GEO101',
  })
  @IsNotEmpty()
  @IsString()
  courseId: string;

  @ApiPropertyOptional({
    description: 'Course description',
    example: 'A comprehensive geography course covering world capitals, countries, and landmarks',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Email or username of the creator',
    example: 'admin@example.com',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  createdBy: string;
}
