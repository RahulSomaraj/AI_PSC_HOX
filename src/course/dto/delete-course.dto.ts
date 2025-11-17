import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteCourseDto {
  @ApiProperty({
    description: 'Email or username of the user deleting the course',
    example: 'admin@example.com',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  deletedBy: string;
}
