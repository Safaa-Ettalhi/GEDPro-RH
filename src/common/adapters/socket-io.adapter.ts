import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { INestApplication, Logger } from '@nestjs/common';

export class SocketIOAdapter extends IoAdapter {
  private readonly logger = new Logger(SocketIOAdapter.name);

  constructor(app: INestApplication) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    this.logger.log(`Création du serveur Socket.io sur le port ${port}`);
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: '*',
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
      allowEIO3: true,
    });

    server.on('connection', (socket) => {
      this.logger.log(
        `Connexion détectée au niveau du serveur principal: ${socket.id}, namespace: ${socket.nsp.name}`,
      );
    });

    this.logger.log(`Serveur Socket.io créé avec succès sur le port ${port}`);
    return server;
  }
}
