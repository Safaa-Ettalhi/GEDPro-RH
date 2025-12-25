import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //avtivation de validation automatique
  app.useGlobalPipes(new ValidationPipe());

  app.enableCors();
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application démarrée sur http://localhost:${port}`);
}
bootstrap();
