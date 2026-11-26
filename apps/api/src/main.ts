import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { loadConfig } from '@servicegrid/config';
import { AppModule } from './app.module';
import { StructuredLoggerService } from './common/logger/structured-logger.service';

async function bootstrap() {
  const config = loadConfig();
  const logger = new StructuredLoggerService();

  const app = await NestFactory.create(AppModule, { logger });
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: config.APP_URL, credentials: true });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('FieldSutra API')
    .setDescription('Field Service Operations Management SaaS REST API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(config.API_PORT);
  logger.log(`FieldSutra API listening on port ${config.API_PORT}`, 'Bootstrap');
}

void bootstrap();
