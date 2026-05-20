import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { REDIS_CLIENT } from './../src/infrastructure/redis/redis.constants';

interface E2EResponseBody {
  data: {
    status?: string;
    services?: {
      redis: {
        status: string;
        latencyMs?: number;
        error?: string;
      };
    };
    query?: string;
    results?: string[];
  };
  message?: string;
}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let redisMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisMock = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      zincrby: jest.fn(),
      zrevrange: jest.fn(),
      zadd: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
      quit: jest.fn().mockResolvedValue('OK'),
      on: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(redisMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    app.setGlobalPrefix('api/v1', {
      exclude: ['health'],
    });
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/health (GET)', () => {
    it('should return 200 and healthy status when Redis is up', () => {
      redisMock.ping.mockResolvedValue('PONG');
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const body = res.body as E2EResponseBody;
          expect(body.data).toHaveProperty('status', 'healthy');
          expect(body.data.services?.redis).toHaveProperty('status', 'up');
          expect(body.data.services?.redis).toHaveProperty('latencyMs');
        });
    });

    it('should return 200 and unhealthy status when Redis is down', () => {
      redisMock.ping.mockRejectedValue(new Error('Connection failure'));
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          const body = res.body as E2EResponseBody;
          expect(body.data).toHaveProperty('status', 'unhealthy');
          expect(body.data.services?.redis).toHaveProperty('status', 'down');
          expect(body.data.services?.redis).toHaveProperty(
            'error',
            'Connection failure',
          );
        });
    });
  });

  describe('/api/v1/search (GET)', () => {
    it('should return 400 when search query q is missing', () => {
      return request(app.getHttpServer())
        .get('/api/v1/search')
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Query parameter "q" is required',
          );
        });
    });

    it('should return 400 when search query exceeds max limit of 200', () => {
      const longQuery = 'a'.repeat(201);
      return request(app.getHttpServer())
        .get(`/api/v1/search?q=${longQuery}`)
        .expect(400)
        .expect((res) => {
          expect(res.body).toHaveProperty(
            'message',
            'Query must not exceed 200 characters',
          );
        });
    });

    it('should return 200 and SearchResultEntity on successful search', () => {
      const query = 'test';
      const mockResult = {
        query,
        results: [
          'Result 1 for test',
          'Result 2 for test',
          'Result 3 for test',
        ],
        timestamp: new Date().toISOString(),
      };
      redisMock.get.mockResolvedValue(JSON.stringify(mockResult));
      redisMock.zincrby.mockResolvedValue(1);

      return request(app.getHttpServer())
        .get(`/api/v1/search?q=${query}`)
        .expect(200)
        .expect((res) => {
          const body = res.body as E2EResponseBody;
          expect(body.data).toHaveProperty('query', query);
          expect(body.data.results).toHaveLength(3);
        });
    });
  });
});
