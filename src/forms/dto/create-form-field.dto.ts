import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsNumber,
  IsArray,
  Min,
  MinLength,
} from 'class-validator';
import { FieldType } from '../../common/enums/field-type.enum';

export class CreateFormFieldDto {
  @IsString()
  @MinLength(1)
  label: string;

  @IsEnum(FieldType)
  type: FieldType;

  @IsOptional()
  @IsString()
  placeholder?: string;

  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  minLength?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxLength?: number;

  @IsOptional()
  @IsNumber()
  minValue?: number;

  @IsOptional()
  @IsNumber()
  maxValue?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  acceptedFileTypes?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
