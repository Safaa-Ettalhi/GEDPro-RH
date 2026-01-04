import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schemas/notification.schema';
import { NotificationType } from '../common/enums/notification-type.enum';
import { NotificationDto } from './dto/notification.dto';
import { NotificationsGateway } from './notifications.gateway';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
  ) {}

  async createAndSend(
    type: NotificationType,
    title: string,
    message: string,
    organizationId: number,
    userIds: number[],
    metadata?: {
      candidateId?: number;
      interviewId?: number;
      [key: string]: unknown;
    },
  ): Promise<NotificationDto[]> {
    const notifications: NotificationDto[] = [];

    for (const userId of userIds) {
      const notification = new this.notificationModel({
        type,
        title,
        message,
        organizationId,
        userId,
        candidateId: metadata?.candidateId,
        interviewId: metadata?.interviewId,
        read: false,
        metadata,
      });

      const saved = await notification.save();
      const notificationDto = this.toDto(saved);

      notifications.push(notificationDto);

      this.notificationsGateway.sendToUser(userId, notificationDto);
      this.notificationsGateway.sendToOrganization(
        organizationId,
        notificationDto,
      );
    }

    this.logger.log(
      `Notification créée et envoyée: ${type} à ${userIds.length} utilisateur(s)`,
    );

    return notifications;
  }

  async createForOrganization(
    type: NotificationType,
    title: string,
    message: string,
    organizationId: number,
    metadata?: {
      candidateId?: number;
      interviewId?: number;
      [key: string]: unknown;
    },
  ): Promise<NotificationDto> {
    const notification = new this.notificationModel({
      type,
      title,
      message,
      organizationId,
      read: false,
      metadata,
    });

    const saved = await notification.save();
    const notificationDto = this.toDto(saved);

    this.notificationsGateway.sendToOrganization(
      organizationId,
      notificationDto,
    );

    this.logger.log(
      `Notification créée pour l'organisation: ${type} (Org: ${organizationId})`,
    );

    return notificationDto;
  }

  async getUnreadNotifications(
    userId: number,
    userRole: Role,
    organizationId: number,
  ): Promise<NotificationDto[]> {
    const query: any = { organizationId, read: false };

    if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
      // Les autres utilisateurs voient uniquement leurs notifications
      query.$or = [{ userId }, { userId: { $exists: false }, organizationId }];
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    return notifications.map((n) => this.toDto(n));
  }

  async getAllNotifications(
    userId: number,
    userRole: Role,
    organizationId: number,
    limit = 50,
    skip = 0,
  ): Promise<{ notifications: NotificationDto[]; total: number }> {
    const query: any = { organizationId };

    if (userRole === Role.ADMIN || userRole === Role.MANAGER) {
      this.logger.log(
        `Récupération de toutes les notifications de l'organisation ${organizationId} pour ${userRole}`,
      );
    } else {
      query.$or = [{ userId }, { userId: { $exists: false }, organizationId }];
    }

    const [notifications, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec(),
      this.notificationModel.countDocuments(query),
    ]);

    return {
      notifications: notifications.map((n) => this.toDto(n)),
      total,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: number,
    organizationId: number,
  ): Promise<void> {
    await this.notificationModel.updateOne(
      {
        _id: notificationId,
        $or: [{ userId }, { userId: { $exists: false }, organizationId }],
        organizationId,
      },
      { read: true },
    );
  }

  async markAllAsRead(userId: number, organizationId: number): Promise<void> {
    await this.notificationModel.updateMany(
      {
        $or: [{ userId }, { userId: { $exists: false }, organizationId }],
        organizationId,
        read: false,
      },
      { read: true },
    );
  }

  async getUnreadCount(
    userId: number,
    userRole: Role,
    organizationId: number,
  ): Promise<number> {
    const query: any = { organizationId, read: false };

    if (userRole !== Role.ADMIN && userRole !== Role.MANAGER) {
      query.$or = [{ userId }, { userId: { $exists: false }, organizationId }];
    }

    return this.notificationModel.countDocuments(query);
  }

  private toDto(notification: NotificationDocument): NotificationDto {
    return {
      id: notification._id.toString(),
      type: notification.type,
      title: notification.title,
      message: notification.message,
      organizationId: notification.organizationId,
      userId: notification.userId,
      candidateId: notification.candidateId,
      interviewId: notification.interviewId,
      read: notification.read,
      createdAt: (notification as any).createdAt || new Date(),
      metadata: notification.metadata,
    };
  }
}
