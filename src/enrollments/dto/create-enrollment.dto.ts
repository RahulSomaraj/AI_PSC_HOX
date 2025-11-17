import { IsInt, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEnrollmentDto {
  @ApiProperty({
    description: 'ID of the user being enrolled',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @ApiProperty({
    description: 'ID of the course to enroll in',
    example: 1,
    type: Number,
  })
  @IsInt()
  @IsNotEmpty()
  courseId: number;

  @ApiPropertyOptional({
    description: 'Enrollment status',
    example: 'pending',
    enum: ['pending', 'active', 'completed', 'cancelled'],
    default: 'pending',
  })
  @IsEnum(['pending', 'active', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
}


