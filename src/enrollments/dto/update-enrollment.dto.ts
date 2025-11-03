import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export class UpdateEnrollmentDto {
  @IsEnum(['pending', 'active', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'active' | 'completed' | 'cancelled';

  @IsDateString()
  @IsOptional()
  completedAt?: string;
}


