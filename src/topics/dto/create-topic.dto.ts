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

export class CreateTopicDto {
  @ApiProperty({
    description: 'ID of the subject this topic belongs to',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  subjectId: number;

  @ApiProperty({
    description: 'Name of the topic',
    example: 'Fundamental Rights',
    maxLength: 200,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    description: 'What the topic covers',
    example: 'Articles 12 to 35 of the Constitution',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Position of the topic within the subject (ascending)',
    example: 3,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({
    description: 'Whether the topic is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
