import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteCourseDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  deletedBy: string;
}
