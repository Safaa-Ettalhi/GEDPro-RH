import { PartialType } from '@nestjs/mapped-types';
import { CreateInterviewDto } from './create-interview.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { InterviewStatus } from '../../common/enums/interview-status.enum';

export class UpdateInterviewDto extends PartialType(CreateInterviewDto) {
  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;
}
