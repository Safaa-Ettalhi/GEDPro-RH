import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateCandidateDto {
  @IsString()
  @MinLength(1)
  firstName: string;

  @IsString()
  @MinLength(1)
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  jobOfferId?: number;

  @IsOptional()
  @IsInt()
  formId?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
