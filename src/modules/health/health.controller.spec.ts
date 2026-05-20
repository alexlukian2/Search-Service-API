import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { REDIS_CLIENT } from '../../infrastructure/redis/redis.constants';

describe('HealthController', () => {
  let controller: HealthController;
  let redisMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisMock = {
      ping: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check', () => {
    it('should return healthy status when redis ping succeeds', async () => {
      redisMock.ping.mockResolvedValue('PONG');

      const result = await controller.check();

      expect(redisMock.ping).toHaveBeenCalled();
      expect(result.status).toBe('healthy');
      expect(result.services.redis.status).toBe('up');
      expect(result.services.redis.latencyMs).toBeDefined();
    });

    it('should return unhealthy status when redis ping throws error', async () => {
      redisMock.ping.mockRejectedValue(new Error('Connection failed'));

      const result = await controller.check();

      expect(redisMock.ping).toHaveBeenCalled();
      expect(result.status).toBe('unhealthy');
      expect(result.services.redis.status).toBe('down');
      expect(result.services.redis.error).toBe('Connection failed');
    });
  });
});
