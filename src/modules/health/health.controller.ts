import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';

interface HealthStatus {
  status: string;
  timestamp: string;
  services: {
    redis: {
      status: string;
      latencyMs?: number;
      error?: string;
    };
  };
}

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check(): Promise<HealthStatus> {
    const redisHealth = await this.checkRedis();

    return {
      status: redisHealth.status === 'up' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisHealth,
      },
    };
  }

  private async checkRedis(): Promise<{
    status: string;
    latencyMs?: number;
    error?: string;
  }> {
    const start = Date.now();

    try {
      await this.redis.ping();
      return {
        status: 'up',
        latencyMs: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
