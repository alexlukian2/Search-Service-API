import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const environment = configService.get<string>('environment') ?? 'development';

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy:
        environment === 'production'
          ? undefined // use helmet defaults in production
          : false, // disable only in development for Swagger UI
    }),
  );

  // CORS — restricted origins from configuration
  const allowedOrigins = configService.get<string[]>('cors.allowedOrigins') ?? [
    'http://localhost:3000',
  ];
  app.enableCors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
    credentials: true,
    maxAge: 86400,
  });

  // API versioning
  app.setGlobalPrefix('api/v1', {
    exclude: ['health'],
  });
  app.enableVersioning({
    type: VersioningType.URI,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
    }),
  );

  // Swagger — only in non-production environments
  if (environment !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Search Service API')
      .setDescription('Search API with Redis caching — Clean Architecture')
      .setVersion('1.0')
      .addTag('search')
      .addTag('health')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log(`Swagger docs available at /api/docs`);
  }

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  logger.log(`Application running on port ${port} [${environment}]`);
}

bootstrap().catch((err) => {
  const logger = new Logger('Bootstrap');
  logger.error('Failed to start application', err);
  process.exit(1);
});
