import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { ISearchCachePort } from '../../application/ports/search-cache.port';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';
import { REDIS_CLIENT } from '../../../../infrastructure/redis/redis.constants';
import {
  SEARCH_CACHE_PREFIX,
  SEARCH_CACHE_TTL_SECONDS,
  SEARCH_POPULAR_KEY,
  SEARCH_STATS_KEY,
} from '../constants/search.constants';

@Injectable()
export class RedisSearchRepositoryAdapter implements ISearchCachePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getCachedSearch(query: string): Promise<SearchResultEntity | null> {
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;
    const result = await this.redis.get(cacheKey);
    return result
      ? new SearchResultEntity(
          JSON.parse(result) as Partial<SearchResultEntity>,
        )
      : null;
  }

  async cacheSearchResult(
    query: string,
    data: SearchResultEntity,
  ): Promise<void> {
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;
    await this.redis.set(
      cacheKey,
      JSON.stringify(data),
      'EX',
      SEARCH_CACHE_TTL_SECONDS,
    );
  }

  async incrementQueryStats(query: string): Promise<void> {
    await this.redis.zincrby(SEARCH_STATS_KEY, 1, query);
  }

  async getTopQueries(
    limit: number,
  ): Promise<{ query: string; count: number }[]> {
    const topQueriesRaw = await this.redis.zrevrange(
      SEARCH_STATS_KEY,
      0,
      limit - 1,
      'WITHSCORES',
    );
    const topQueries = [];
    for (let i = 0; i < topQueriesRaw.length; i += 2) {
      topQueries.push({
        query: topQueriesRaw[i],
        count: parseInt(topQueriesRaw[i + 1], 10),
      });
    }
    return topQueries;
  }

  async getTopQueriesRaw(limit: number): Promise<string[]> {
    return this.redis.zrevrange(SEARCH_STATS_KEY, 0, limit - 1);
  }

  async savePopularQueries(queries: string[]): Promise<void> {
    const popularSetArgs: (string | number)[] = [];
    queries.forEach((q, index) => {
      popularSetArgs.push(queries.length - index, q);
    });

    if (popularSetArgs.length > 0) {
      await this.redis.zadd(SEARCH_POPULAR_KEY, ...popularSetArgs);
    }
  }

  async checkCacheExists(query: string): Promise<boolean> {
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;
    const exists = await this.redis.exists(cacheKey);
    return exists === 1;
  }

  async invalidateCache(query: string): Promise<boolean> {
    const cacheKey = `${SEARCH_CACHE_PREFIX}${query}`;
    const result = await this.redis.del(cacheKey);
    return result === 1;
  }
}
