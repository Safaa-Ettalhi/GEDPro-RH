import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CandidateState } from '../../common/enums/candidate-state.enum';

export class ChangeStateDto {
  @IsEnum(CandidateState)
  newState: CandidateState;

  @IsOptional()
  @IsString()
  comment?: string;
}
