import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { InterviewType } from '../../common/enums/interview-type.enum';

export class CreateInterviewDto {
  @IsNotEmpty()
  @IsNumber()
  candidateId: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{4}-\d{1,2}-\d{1,2}$/, {
    message: 'date must be in format YYYY-MM-DD or YYYY-M-D',
  })
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value === 'string') {
      const parts = value.split('-');
      if (parts.length === 3) {
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    return value as string;
  })
  date: string;

  @IsNotEmpty()
  @IsString()
  startTime: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(15)
  @Max(480)
  duration: number;

  @IsOptional()
  @IsEnum(InterviewType)
  type?: InterviewType;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingLink?: string;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  participantIds?: number[];

  @IsOptional()
  @IsString()
  notes?: string;
}
