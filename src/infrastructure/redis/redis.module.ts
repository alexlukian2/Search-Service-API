import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        const url = configService.get<string>('redis.url');
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');

        const client = url ? new Redis(url) : new Redis({ host, port });

        client.on('connect', () => {
          logger.log(`Connected to Redis at ${host}:${port} successfully`);
        });

        client.on('error', (err) => {
          logger.error('Redis connection error', err);
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
