import { IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class DeleteUserDto {
  @IsNotEmpty({ message: 'deletedBy is required' })
  @Type(() => Number)
  @IsInt({ message: 'deletedBy must be a number' })
  deletedBy: number;
}
