import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { CandidateState } from '../../common/enums/candidate-state.enum';

export type CandidateStateHistoryDocument = CandidateStateHistory & Document;

@Schema({ timestamps: true })
export class CandidateStateHistory {
  @Prop({ required: true })
  candidateId: number;

  @Prop({ required: true })
  organizationId: number;

  @Prop({
    type: String,
    enum: CandidateState,
    required: true,
  })
  previousState: CandidateState;

  @Prop({
    type: String,
    enum: CandidateState,
    required: true,
  })
  newState: CandidateState;

  @Prop({ required: true })
  changedBy: number;

  @Prop({ required: true })
  changedByName: string;

  @Prop({ type: String, required: false })
  comment?: string;

  @Prop({ default: Date.now })
  changedAt: Date;
}

export const CandidateStateHistorySchema = SchemaFactory.createForClass(
  CandidateStateHistory,
);

CandidateStateHistorySchema.index({ candidateId: 1, organizationId: 1 });
CandidateStateHistorySchema.index({ changedAt: -1 });
