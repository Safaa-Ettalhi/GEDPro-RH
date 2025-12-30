import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';
import { FormType } from '../../common/enums/form-type.enum';

export class UpdateFormDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(FormType)
  type?: FormType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
