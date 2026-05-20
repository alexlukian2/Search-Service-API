import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
} from '@nestjs/common';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisDisconnectService implements OnApplicationShutdown {
  private readonly logger = new Logger(RedisDisconnectService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.logger.log(
      `Closing Redis connection (signal: ${signal ?? 'none'})...`,
    );

    try {
      await this.redis.quit();
      this.logger.log('Redis connection closed gracefully');
    } catch (error) {
      this.logger.error('Error closing Redis connection', error);
    }
  }
}
