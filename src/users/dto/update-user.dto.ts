import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsEmail, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'first name must be at most 50 characters' })
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50, { message: 'last name must be at most 50 characters' })
    lastName?: string;

    @IsOptional()
    @IsEmail({}, { message: 'Email must be valid' })
    @MaxLength(254, { message: 'Email must be at most 254 characters' })
    @Transform(({ value }) =>
        typeof value === 'string' ? value.trim().toLowerCase() : value,
    )
    email?: string;

    @IsOptional()
    @Matches(/^[6-9]\d{9}$/, {
        message: 'Phone number must be a 10-digit Indian mobile number',
    })
    phone?: string;

    @IsOptional()
    @MaxLength(2048, { message: 'photoURL is too long' })
    @IsUrl({}, { message: 'photoURL must be a valid URL' })
    photoURL?: string;

    
    @IsOptional()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @MaxLength(128, { message: 'Password must be at most 128 characters' })
    password?: string;
}
