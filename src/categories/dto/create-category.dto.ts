import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Category name',
    example: 'Geography',
  })
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  name: string;

  @ApiPropertyOptional({
    description: 'Category description',
    example: 'Questions related to geography, countries, and capitals',
  })
  @IsString()
  description: string;
}
