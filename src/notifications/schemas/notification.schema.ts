import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { NotificationType } from '../../common/enums/notification-type.enum';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ required: true, enum: NotificationType })
  type: NotificationType;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  organizationId: number;

  @Prop()
  userId?: number;

  @Prop()
  candidateId?: number;

  @Prop()
  interviewId?: number;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ organizationId: 1, userId: 1, read: 1 });
NotificationSchema.index({ createdAt: -1 });
