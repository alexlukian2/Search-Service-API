import { Global, Module, Logger } from '@nestjs/common';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';
import { RedisDisconnectService } from './redis-disconnect.service';

function sanitizeRedisUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = '***';
    }
    return parsed.toString();
  } catch {
    return '<invalid-url>';
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService): Redis => {
        const logger = new Logger('RedisModule');
        const url = configService.get<string>('redis.url');
        const host = configService.get<string>('redis.host');
        const port = configService.get<number>('redis.port');
        const password = configService.get<string>('redis.password');

        let client: Redis;

        if (url) {
          client = new Redis(url);
        } else {
          client = new Redis({
            host,
            port,
            ...(password ? { password } : {}),
          });
        }

        const connectionLabel = url ? sanitizeRedisUrl(url) : `${host}:${port}`;

        client.on('connect', () => {
          logger.log(`Connected to Redis at ${connectionLabel}`);
        });

        client.on('error', (err: Error) => {
          logger.error(
            `Redis connection error (${connectionLabel}): ${err.message}`,
          );
        });

        return client;
      },
      inject: [ConfigService],
    },
    RedisDisconnectService,
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
