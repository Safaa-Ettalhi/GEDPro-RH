import { IsString, IsOptional, IsEnum } from 'class-validator';
import { SkillCategory } from './create-skill.dto';

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;
}
