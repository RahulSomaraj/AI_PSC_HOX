import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateExamLevelDto {
  @ApiProperty({
    description: 'Name of the exam level',
    example: 'Degree Level',
    maxLength: 120,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    description: 'What the level covers',
    example:
      'Posts that require a bachelor degree as the minimum qualification',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Position of the level in listings (ascending)',
    example: 3,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the level is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
