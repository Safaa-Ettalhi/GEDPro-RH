import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { SocketIOAdapter } from './common/adapters/socket-io.adapter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new SocketIOAdapter(app));

  // Exception filter global
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('GEDPro API')
    .setDescription(
      'API de la plateforme GED RH Intelligente - Gestion Électronique de Documents pour les Ressources Humaines',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('auth', 'Authentification et gestion des utilisateurs')
    .addTag('organizations', 'Gestion des organisations')
    .addTag('candidates', 'Gestion des candidats')
    .addTag('documents', 'Gestion documentaire et OCR')
    .addTag('forms', 'Formulaires dynamiques RH')
    .addTag('interviews', 'Gestion des entretiens et calendrier')
    .addTag('skills', 'Gestion des compétences')
    .addTag('notifications', 'Notifications temps réel')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application démarrée sur http://localhost:${port}`);
  console.log(`WebSocket disponible sur ws://localhost:${port}/notifications`);
  console.log(
    `Documentation Swagger disponible sur http://localhost:${port}/api`,
  );
}
bootstrap();
