import { IsEmail, IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsEnum(['admin', 'customer', 'editor'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
