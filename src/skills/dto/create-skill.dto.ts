import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';

export enum SkillCategory {
  TECHNIQUE = 'technique',
  LANGUE = 'langue',
  SOFT_SKILL = 'soft_skill',
}

export class CreateSkillDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SkillCategory)
  category?: SkillCategory;
}
