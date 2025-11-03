import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

export class CreateEnrollmentDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @IsEnum(['pending', 'active', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
}


