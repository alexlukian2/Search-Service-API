import { Test, TestingModule } from '@nestjs/testing';
import { RedisSearchCacheAdapter } from './redis-search-cache.adapter';
import { REDIS_CLIENT } from '../../../../infrastructure/redis/redis.constants';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';
import {
  SEARCH_CACHE_PREFIX,
  SEARCH_CACHE_TTL_SECONDS,
  SEARCH_POPULAR_KEY,
  SEARCH_STATS_KEY,
} from '../constants/search.constants';

describe('RedisSearchCacheAdapter', () => {
  let adapter: RedisSearchCacheAdapter;
  let redisMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    redisMock = {
      get: jest.fn(),
      set: jest.fn(),
      zincrby: jest.fn(),
      zrevrange: jest.fn(),
      zadd: jest.fn(),
      exists: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisSearchCacheAdapter,
        {
          provide: REDIS_CLIENT,
          useValue: redisMock,
        },
      ],
    }).compile();

    adapter = module.get<RedisSearchCacheAdapter>(RedisSearchCacheAdapter);
  });

  it('should be defined', () => {
    expect(adapter).toBeDefined();
  });

  describe('getCachedSearch', () => {
    const query = 'test';
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;

    it('should return parsed SearchResultEntity on cache hit', async () => {
      const mockProps = {
        query,
        results: ['a', 'b'],
        timestamp: new Date().toISOString(),
      };
      redisMock.get.mockResolvedValue(JSON.stringify(mockProps));

      const result = await adapter.getCachedSearch(query);

      expect(redisMock.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toBeInstanceOf(SearchResultEntity);
      expect(result?.query).toBe(query);
      expect(result?.results).toEqual(['a', 'b']);
    });

    it('should return null on cache miss', async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await adapter.getCachedSearch(query);

      expect(redisMock.get).toHaveBeenCalledWith(cacheKey);
      expect(result).toBeNull();
    });

    it('should delete corrupted cache entry and return null if parsing fails', async () => {
      redisMock.get.mockResolvedValue('invalid { json }');

      const result = await adapter.getCachedSearch(query);

      expect(redisMock.get).toHaveBeenCalledWith(cacheKey);
      expect(redisMock.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBeNull();
    });
  });

  describe('cacheSearchResult', () => {
    it('should store SearchResultEntity in Redis with TTL', async () => {
      const query = 'test';
      const entity = new SearchResultEntity({
        query,
        results: ['res'],
        timestamp: new Date().toISOString(),
      });

      await adapter.cacheSearchResult(query, entity);

      expect(redisMock.set).toHaveBeenCalledWith(
        `${SEARCH_CACHE_PREFIX}${query}`,
        JSON.stringify(entity),
        'EX',
        SEARCH_CACHE_TTL_SECONDS,
      );
    });
  });

  describe('incrementQueryStats', () => {
    it('should increment query stats in Sorted Set', async () => {
      const query = 'test';
      await adapter.incrementQueryStats(query);
      expect(redisMock.zincrby).toHaveBeenCalledWith(
        SEARCH_STATS_KEY,
        1,
        query,
      );
    });
  });

  describe('getTopQueries', () => {
    it('should return formatted top queries with score counts', async () => {
      // zrevrange WITHSCORES returns [member1, score1, member2, score2, ...]
      redisMock.zrevrange.mockResolvedValue(['nest', '10', 'redis', '5']);

      const result = await adapter.getTopQueries(2);

      expect(redisMock.zrevrange).toHaveBeenCalledWith(
        SEARCH_STATS_KEY,
        0,
        1,
        'WITHSCORES',
      );
      expect(result).toEqual([
        { query: 'nest', count: 10 },
        { query: 'redis', count: 5 },
      ]);
    });
  });

  describe('getTopQueriesRaw', () => {
    it('should return array of top queries without scores', async () => {
      redisMock.zrevrange.mockResolvedValue(['nest', 'redis']);

      const result = await adapter.getTopQueriesRaw(2);

      expect(redisMock.zrevrange).toHaveBeenCalledWith(SEARCH_STATS_KEY, 0, 1);
      expect(result).toEqual(['nest', 'redis']);
    });
  });

  describe('savePopularQueries', () => {
    it('should score and store popular queries in Redis', async () => {
      const queries = ['nest', 'redis', 'ts'];
      // Scores: nest: 3, redis: 2, ts: 1
      await adapter.savePopularQueries(queries);

      expect(redisMock.zadd).toHaveBeenCalledWith(
        SEARCH_POPULAR_KEY,
        3,
        'nest',
        2,
        'redis',
        1,
        'ts',
      );
    });

    it('should not call zadd if queries array is empty', async () => {
      await adapter.savePopularQueries([]);
      expect(redisMock.zadd).not.toHaveBeenCalled();
    });
  });

  describe('checkCacheExists', () => {
    const query = 'exists-test';
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;

    it('should return true if exists returns 1', async () => {
      redisMock.exists.mockResolvedValue(1);
      const result = await adapter.checkCacheExists(query);
      expect(redisMock.exists).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(true);
    });

    it('should return false if exists returns 0', async () => {
      redisMock.exists.mockResolvedValue(0);
      const result = await adapter.checkCacheExists(query);
      expect(redisMock.exists).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(false);
    });
  });

  describe('invalidateCache', () => {
    const query = 'del-test';
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;

    it('should return true if del returns 1', async () => {
      redisMock.del.mockResolvedValue(1);
      const result = await adapter.invalidateCache(query);
      expect(redisMock.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(true);
    });

    it('should return false if del returns 0', async () => {
      redisMock.del.mockResolvedValue(0);
      const result = await adapter.invalidateCache(query);
      expect(redisMock.del).toHaveBeenCalledWith(cacheKey);
      expect(result).toBe(false);
    });
  });
});
