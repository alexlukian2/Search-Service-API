import { Injectable, Logger, Inject } from '@nestjs/common';
import { SEARCH_CACHE_PORT } from '../ports/search-cache.port';
import type { ISearchCachePort } from '../ports/search-cache.port';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';
import {
  SEARCH_TOP_QUERIES_LIMIT,
  SEARCH_PRECACHE_DEFAULT_LIMIT,
} from '../../infrastructure/constants/search.constants';

interface SearchStats {
  topQueries: { query: string; count: number }[];
}

interface PrecacheResult {
  message: string;
  totalProcessed?: number;
  newlyCached?: number;
  queries?: string[];
}

interface InvalidateCacheResult {
  message: string;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    @Inject(SEARCH_CACHE_PORT)
    private readonly searchCachePort: ISearchCachePort,
  ) {}

  async search(query: string): Promise<SearchResultEntity> {
    await this.searchCachePort.incrementQueryStats(query);

    const cachedResult = await this.searchCachePort.getCachedSearch(query);
    if (cachedResult) {
      this.logger.debug(`Cache hit for query: "${query}"`);
      return cachedResult;
    }

    this.logger.debug(`Cache miss for query: "${query}". Simulating search...`);

    // TODO: Replace with ISearchProviderPort when integrating a real search backend
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 1000),
    );

    const result = new SearchResultEntity({
      query,
      results: [
        `Result 1 for ${query}`,
        `Result 2 for ${query}`,
        `Result 3 for ${query}`,
      ],
      timestamp: new Date().toISOString(),
    });

    await this.searchCachePort.cacheSearchResult(query, result);

    return result;
  }

  async getStats(): Promise<SearchStats> {
    const topQueries = await this.searchCachePort.getTopQueries(
      SEARCH_TOP_QUERIES_LIMIT,
    );
    return { topQueries };
  }

  async precache(queries?: string[]): Promise<PrecacheResult> {
    let queriesToCache = queries;

    if (!queriesToCache || queriesToCache.length === 0) {
      queriesToCache = await this.searchCachePort.getTopQueriesRaw(
        SEARCH_PRECACHE_DEFAULT_LIMIT,
      );
    }

    if (queriesToCache.length === 0) {
      return { message: 'No queries to precache.' };
    }

    await this.searchCachePort.savePopularQueries(queriesToCache);

    const cacheChecks = await Promise.all(
      queriesToCache.map(async (query) => ({
        query,
        exists: await this.searchCachePort.checkCacheExists(query),
      })),
    );

    const uncachedQueries = cacheChecks
      .filter((check) => !check.exists)
      .map((check) => check.query);

    await Promise.allSettled(
      uncachedQueries.map((query) => this.search(query)),
    );

    return {
      message: 'Pre-caching completed successfully.',
      totalProcessed: queriesToCache.length,
      newlyCached: uncachedQueries.length,
      queries: queriesToCache,
    };
  }

  async invalidateCache(query: string): Promise<InvalidateCacheResult> {
    const success = await this.searchCachePort.invalidateCache(query);

    if (success) {
      return { message: `Cache invalidated for query: "${query}"` };
    }

    return { message: `No cache found for query: "${query}"` };
  }
}
