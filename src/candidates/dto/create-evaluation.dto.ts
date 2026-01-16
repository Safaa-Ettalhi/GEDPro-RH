import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsString,
} from 'class-validator';
import { EvaluationRecommendation } from '../../common/enums/evaluation-recommendation.enum';

export class CreateEvaluationDto {
  @IsNotEmpty()
  @IsNumber()
  candidateId: number;

  @IsOptional()
  @IsNumber()
  interviewId?: number;

  @IsNotEmpty()
  @IsEnum(EvaluationRecommendation)
  recommendation: EvaluationRecommendation;

  @IsOptional()
  @IsString()
  comment?: string;
}
