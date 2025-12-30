import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  MinLength,
} from 'class-validator';

export class CreateJobOfferDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  formId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
