import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '../../common/enums/document-type.enum';

export class UpdateDocumentDto {
  @IsOptional()
  @IsEnum(DocumentType)
  type?: DocumentType;

  @IsOptional()
  @IsString()
  description?: string;
}
