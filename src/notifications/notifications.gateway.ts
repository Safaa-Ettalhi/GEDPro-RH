import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import { NotificationDto } from './dto/notification.dto';
import { JWT_SECRET } from '../auth/constants/jwt.constants';
import { UserOrganization } from '../organizations/entities/user-organization.entity';

interface AuthenticatedSocket extends Socket {
  userId?: number;
  organizationId?: number;
}

@WebSocketGateway({
  cors: {
    origin: '*', // En production, spécifiez les origines autorisées
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly connectedUsers = new Map<number, Set<string>>(); // userId -> Set<socketId>

  afterInit(server: Server) {
    this.logger.log(
      'WebSocket Gateway initialisé sur le namespace /notifications',
    );
    this.logger.log(`Serveur WebSocket prêt et en écoute`);
    server.on('connection', (socket) => {
      this.logger.log(`Nouvelle connexion WebSocket détectée: ${socket.id}`);
    });
  }

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => NotificationsService))
    private notificationsService: NotificationsService,
    @InjectRepository(UserOrganization)
    private userOrganizationRepository: Repository<UserOrganization>,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`=== NOUVELLE TENTATIVE DE CONNEXION ===`);
    this.logger.log(`Client ID: ${client.id}`);
    this.logger.log(`Query params: ${JSON.stringify(client.handshake.query)}`);
    this.logger.log(
      `Headers authorization: ${client.handshake.headers.authorization || 'non fourni'}`,
    );

    try {
      // Authentifier le client via le token JWT
      const token = this.extractTokenFromSocket(client);
      this.logger.log(
        `Token extrait pour le client ${client.id}: ${token ? 'Oui (longueur: ' + token.length + ')' : 'Non'}`,
      );

      if (!token) {
        this.logger.warn(`Client ${client.id} connecté sans token`);
        client.disconnect();
        return;
      }

      let payload;
      try {
        payload = this.jwtService.verify(token, {
          secret: JWT_SECRET,
        });
        this.logger.log(
          `Token JWT vérifié pour le client ${client.id}, userId: ${payload.sub}`,
        );
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Erreur lors de la vérification du token JWT pour le client ${client.id}: ${errorMessage}`,
        );
        client.disconnect();
        return;
      }

      client.userId = payload.sub;

      const orgIdFromQuery = client.handshake.query.organizationId as string;
      this.logger.log(
        `organizationId depuis query: ${orgIdFromQuery || 'non fourni'}`,
      );

      if (orgIdFromQuery) {
        client.organizationId = parseInt(orgIdFromQuery, 10);
      } else {
        try {
          const userOrg = await this.userOrganizationRepository.findOne({
            where: { userId: client.userId },
          });
          if (userOrg) {
            client.organizationId = userOrg.organizationId;
            this.logger.log(
              `organizationId récupéré depuis la DB: ${client.organizationId}`,
            );
          } else {
            this.logger.warn(
              `Aucune organisation trouvée pour l'utilisateur ${client.userId}`,
            );
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Erreur inconnue';
          this.logger.error(
            `Erreur lors de la récupération de l'organisation: ${errorMessage}`,
          );
        }
      }

      if (!client.userId || !client.organizationId) {
        this.logger.warn(
          `Client ${client.id} connecté sans userId ou organizationId (userId: ${client.userId}, orgId: ${client.organizationId})`,
        );
        client.disconnect();
        return;
      }

      if (!this.connectedUsers.has(client.userId)) {
        this.connectedUsers.set(client.userId, new Set());
      }
      this.connectedUsers.get(client.userId)?.add(client.id);

      client.join(`org:${client.organizationId}`);
      client.join(`user:${client.userId}`);

      this.logger.log(
        `Client ${client.id} connecté (User: ${client.userId}, Org: ${client.organizationId})`,
      );

      try {
        const userRole = payload.role;
        const unreadNotifications =
          await this.notificationsService.getUnreadNotifications(
            client.userId,
            userRole,
            client.organizationId,
          );
        this.logger.log(
          `Envoi de ${unreadNotifications.length} notification(s) non lue(s) au client ${client.id}`,
        );
        client.emit('notifications:unread', unreadNotifications);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Erreur inconnue';
        this.logger.error(
          `Erreur lors de la récupération des notifications non lues: ${errorMessage}`,
        );
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      const errorStack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `Erreur lors de la connexion du client ${client.id}: ${errorMessage}`,
      );
      this.logger.error(`Stack trace: ${errorStack}`);
      try {
        client.disconnect();
      } catch (disconnectError) {
        // Ignorer les erreurs de déconnexion
      }
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(
        `Client ${client.id} déconnecté (User: ${client.userId})`,
      );
    }
  }

  @SubscribeMessage('notifications:mark-read')
  @UseGuards(JwtAuthGuard)
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { notificationId: string },
  ) {
    if (!client.userId || !client.organizationId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      await this.notificationsService.markAsRead(
        data.notificationId,
        client.userId,
        client.organizationId,
      );
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors du marquage de la notification comme lue: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }

  @SubscribeMessage('notifications:mark-all-read')
  @UseGuards(JwtAuthGuard)
  async handleMarkAllAsRead(@ConnectedSocket() client: AuthenticatedSocket) {
    if (!client.userId || !client.organizationId) {
      return { success: false, error: 'Non authentifié' };
    }

    try {
      await this.notificationsService.markAllAsRead(
        client.userId,
        client.organizationId,
      );
      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors du marquage de toutes les notifications comme lues: ${errorMessage}`,
      );
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Envoie une notification à un utilisateur spécifique
   */
  sendToUser(userId: number, notification: NotificationDto) {
    const userSockets = this.connectedUsers.get(userId);
    if (userSockets && userSockets.size > 0) {
      this.logger.log(
        `Envoi de notification à l'utilisateur ${userId} (${userSockets.size} socket(s) connecté(s))`,
      );
      userSockets.forEach((socketId) => {
        this.server.to(socketId).emit('notification:new', notification);
      });
    } else {
      this.logger.warn(
        `Utilisateur ${userId} non connecté au WebSocket. Notification sauvegardée mais non envoyée en temps réel.`,
      );
    }
  }

  /**
   * Envoie une notification à tous les utilisateurs d'une organisation
   */
  sendToOrganization(organizationId: number, notification: NotificationDto) {
    this.server
      .to(`org:${organizationId}`)
      .emit('notification:new', notification);
  }

  /**
   * Envoie une notification à des utilisateurs spécifiques d'une organisation
   */
  sendToUsers(
    userIds: number[],
    organizationId: number,
    notification: NotificationDto,
  ) {
    userIds.forEach((userId) => {
      this.sendToUser(userId, notification);
    });
    // Également envoyer à la room de l'organisation pour les autres utilisateurs autorisés
    this.server
      .to(`org:${organizationId}`)
      .emit('notification:new', notification);
  }

  private extractTokenFromSocket(client: Socket): string | null {
    try {
      // Essayer d'abord dans les query params
      const token = client.handshake.query.token as string;
      if (token && typeof token === 'string' && token.length > 0) {
        this.logger.log(
          `Token trouvé dans query params pour le client ${client.id}`,
        );
        return token;
      }

      // Essayer dans les headers (avec ou sans "Bearer ")
      const authHeader = client.handshake.headers.authorization;
      if (authHeader && typeof authHeader === 'string') {
        if (authHeader.startsWith('Bearer ')) {
          this.logger.log(
            `Token trouvé dans headers (Bearer) pour le client ${client.id}`,
          );
          return authHeader.substring(7);
        } else {
          // Postman envoie parfois le token directement sans "Bearer "
          this.logger.log(
            `Token trouvé dans headers (direct) pour le client ${client.id}`,
          );
          return authHeader;
        }
      }

      // Essayer dans auth (pour certains clients WebSocket)
      const authToken = (client.handshake.auth as { token?: string })?.token;
      if (authToken && typeof authToken === 'string' && authToken.length > 0) {
        this.logger.log(`Token trouvé dans auth pour le client ${client.id}`);
        return authToken;
      }

      this.logger.warn(
        `Aucun token trouvé pour le client ${client.id}. Query: ${JSON.stringify(client.handshake.query)}, Headers auth: ${client.handshake.headers.authorization || 'non fourni'}`,
      );
      return null;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(
        `Erreur lors de l'extraction du token: ${errorMessage}`,
      );
      return null;
    }
  }
}
