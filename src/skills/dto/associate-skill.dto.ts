import { IsInt, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class AssociateSkillDto {
  @IsInt()
  skillId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence?: number;
}
