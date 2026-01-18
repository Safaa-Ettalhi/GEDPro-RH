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
    const query: Record<string, unknown> = { read: false };

    if (userRole === Role.CANDIDATE) {
      query.userId = userId;
      this.logger.log(
        `[GET UNREAD NOTIFICATIONS] Candidat ${userId} - Récupération des notifications non lues (query: ${JSON.stringify(query)})`,
      );
    } else if (
      userRole === Role.ADMIN ||
      userRole === Role.RH ||
      userRole === Role.MANAGER
    ) {
      query.organizationId = organizationId;
    } else {
      query.$or = [
        { userId, organizationId },
        { userId: { $exists: false }, organizationId },
      ];
    }

    const notifications = await this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .exec();

    if (userRole === Role.CANDIDATE) {
      this.logger.log(
        `[GET UNREAD NOTIFICATIONS] Candidat ${userId} - ${notifications.length} notification(s) non lue(s) trouvée(s)`,
      );
    }

    return notifications.map((n) => this.toDto(n));
  }

  async getAllNotifications(
    userId: number,
    userRole: Role,
    organizationId: number,
    limit = 50,
    skip = 0,
  ): Promise<{ notifications: NotificationDto[]; total: number }> {
    let query: Record<string, unknown>;

    if (userRole === Role.CANDIDATE) {
      query = { userId };
      this.logger.log(
        `[GET ALL NOTIFICATIONS] Candidat ${userId} - Récupération de toutes les notifications (query: ${JSON.stringify(query)})`,
      );
    } else if (
      userRole === Role.ADMIN ||
      userRole === Role.RH ||
      userRole === Role.MANAGER
    ) {
      query = { organizationId };
      this.logger.log(
        `Récupération de toutes les notifications de l'organisation ${organizationId} pour ${userRole}`,
      );
    } else {
      query = {
        $or: [
          { userId, organizationId },
          { userId: { $exists: false }, organizationId },
        ],
      };
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

    if (userRole === Role.CANDIDATE) {
      this.logger.log(
        `[GET ALL NOTIFICATIONS] Candidat ${userId} - ${notifications.length} notification(s) trouvée(s) (total: ${total})`,
      );
      if (notifications.length > 0) {
        this.logger.log(
          `[GET ALL NOTIFICATIONS] Exemples de notifications: ${notifications
            .slice(0, 3)
            .map(
              (n) =>
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                `ID: ${n._id}, type: ${n.type}, userId: ${n.userId}, organizationId: ${n.organizationId}`,
            )
            .join('; ')}`,
        );
      }
    }

    return {
      notifications: notifications.map((n) => this.toDto(n)),
      total,
    };
  }

  async markAsRead(
    notificationId: string,
    userId: number,
    organizationId: number,
    userRole?: Role,
  ): Promise<void> {
    const baseQuery: Record<string, unknown> = { _id: notificationId };
    if (userRole === Role.CANDIDATE) {
      baseQuery.userId = userId;
    } else {
      baseQuery.organizationId = organizationId;
      baseQuery.$or = [{ userId }, { userId: { $exists: false } }];
    }
    await this.notificationModel.updateOne(baseQuery, { read: true });
  }

  async markAllAsRead(
    userId: number,
    userRole: Role,
    organizationId: number,
  ): Promise<void> {
    const query: Record<string, unknown> = { read: false };
    if (userRole === Role.CANDIDATE) {
      query.userId = userId;
    } else if (
      userRole === Role.ADMIN ||
      userRole === Role.RH ||
      userRole === Role.MANAGER
    ) {
      query.organizationId = organizationId;
    } else {
      query.$or = [
        { userId, organizationId },
        { userId: { $exists: false }, organizationId },
      ];
    }
    await this.notificationModel.updateMany(query, { read: true });
  }

  async getUnreadCount(
    userId: number,
    userRole: Role,
    organizationId: number,
  ): Promise<number> {
    const query: Record<string, unknown> = { read: false };
    if (userRole === Role.CANDIDATE) {
      query.userId = userId;
      this.logger.log(
        `[GET UNREAD COUNT] Candidat ${userId} - Comptage des notifications non lues (query: ${JSON.stringify(query)})`,
      );
    } else if (
      userRole === Role.ADMIN ||
      userRole === Role.RH ||
      userRole === Role.MANAGER
    ) {
      query.organizationId = organizationId;
    } else {
      query.$or = [
        { userId, organizationId },
        { userId: { $exists: false }, organizationId },
      ];
    }
    const count = await this.notificationModel.countDocuments(query);
    if (userRole === Role.CANDIDATE) {
      this.logger.log(
        `[GET UNREAD COUNT] Candidat ${userId} - ${count} notification(s) non lue(s)`,
      );
    }
    return count;
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
      createdAt:
        (notification as NotificationDocument & { createdAt?: Date })
          .createdAt || new Date(),
      metadata: notification.metadata,
    };
  }
}
