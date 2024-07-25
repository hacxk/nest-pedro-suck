import { IsString, IsEmail, MinLength, IsStrongPassword, Validate } from 'class-validator';
import { MatchPassword } from '../../../shared/validators/match';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  username: string;

  @IsString()
  @MinLength(8)
  @IsStrongPassword()
  password: string;

  @IsString()
  @Validate(MatchPassword, ['password'])
  confirmPassword: string;
}
