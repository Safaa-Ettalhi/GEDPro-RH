import { NotificationType } from '../../common/enums/notification-type.enum';

export class NotificationDto {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  organizationId: number;
  userId?: number;
  candidateId?: number;
  interviewId?: number;
  read: boolean;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}
