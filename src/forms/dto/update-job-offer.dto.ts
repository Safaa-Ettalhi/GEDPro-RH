import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ContractType } from '../../common/enums/contract-type.enum';

export class UpdateJobOfferDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  salary?: number;

  @IsOptional()
  @IsEnum(ContractType)
  contractType?: ContractType;

  @IsOptional()
  @IsInt()
  formId?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
