import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security
  app.use(helmet({ contentSecurityPolicy: false }));
  app.enableCors();

  // Global Middlewares
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Set up Swagger
  const config = new DocumentBuilder()
    .setTitle('Search Service API')
    .setDescription(
      'The Search API description with Redis caching (Clean Architecture)',
    )
    .setVersion('1.0')
    .addTag('search')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = configService.get<number>('port') ?? 3000;
  await app.listen(port);
  console.log(`Application is running on port ${port}`);

}
bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
