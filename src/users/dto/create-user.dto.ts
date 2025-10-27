import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'first name is required' })
  @MaxLength(50, { message: 'first name must be at most 50 characters' })
  firstName: string;

  @IsString()
  @IsNotEmpty({ message: 'last name is required' })
  @MaxLength(50, { message: 'first name must be at most 50 characters' })
  lastName: string;

  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Email must be Valid' })
  @MaxLength(254, { message: 'Email must be at most 254 characters' })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone number must be a 10-digit Indian mobile number',
  })
  phone: string;

  @IsOptional()
  @MaxLength(2048, { message: 'photoURL is too long' })
  @IsUrl({}, { message: 'photoURL must be a valid URL' })
  photoURL: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must be at most 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message:
      'Password must include at least 1 uppercase, 1 lowercase, 1 number, and 1 special character',
  })
  password: string;

  @IsString({ message: 'Role must be a string' })
  @Matches(/^(user|admin)$/, {
    message: 'Role must be one of: user, admin',
  })
  role: string;
}
