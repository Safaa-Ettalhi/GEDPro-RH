import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema()
export class Session {
  @Prop({ required: true })
  userId: number;

  @Prop({ required: true })
  token: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  expiresAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
