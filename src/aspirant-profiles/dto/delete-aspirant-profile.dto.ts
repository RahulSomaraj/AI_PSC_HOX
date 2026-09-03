import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class DeleteAspirantProfileDto {
  @ApiProperty({
    description: 'ID of the user performing the deletion',
    example: 1,
    type: Number,
  })
  @IsNotEmpty({ message: 'deletedBy is required' })
  @Type(() => Number)
  @IsInt({ message: 'deletedBy must be a number' })
  deletedBy: number;
}
