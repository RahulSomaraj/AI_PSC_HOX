import { IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEnrollmentDto {
  @ApiPropertyOptional({
    description: 'Enrollment status',
    example: 'active',
    enum: ['pending', 'active', 'completed', 'cancelled'],
  })
  @IsEnum(['pending', 'active', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'active' | 'completed' | 'cancelled';

  @ApiPropertyOptional({
    description: 'Date when the enrollment was completed (ISO 8601 format)',
    example: '2025-10-29T12:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  completedAt?: string;
}


