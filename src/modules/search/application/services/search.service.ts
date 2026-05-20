import { Injectable, Logger, Inject } from '@nestjs/common';
import { SEARCH_CACHE_PORT } from '../ports/search-cache.port';
import type { ISearchCachePort } from '../ports/search-cache.port';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';

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

  async getStats() {
    const topQueries = await this.searchCachePort.getTopQueries(10);
    return { topQueries };
  }

  async precache(queries?: string[]) {
    let queriesToCache = queries;

    if (!queriesToCache || queriesToCache.length === 0) {
      queriesToCache = await this.searchCachePort.getTopQueriesRaw(5);
    }

    if (queriesToCache.length === 0) {
      return { message: 'No queries to precache.' };
    }

    await this.searchCachePort.savePopularQueries(queriesToCache);

    let cachedCount = 0;
    for (const query of queriesToCache) {
      const exists = await this.searchCachePort.checkCacheExists(query);
      if (!exists) {
        await this.search(query);
        cachedCount++;
      }
    }

    return {
      message: 'Pre-caching completed successfully.',
      totalProcessed: queriesToCache.length,
      newlyCached: cachedCount,
      queries: queriesToCache,
    };
  }

  async invalidateCache(query: string) {
    const success = await this.searchCachePort.invalidateCache(query);

    if (success) {
      return { message: `Cache invalidated for query: "${query}"` };
    } else {
      return { message: `No cache found for query: "${query}"` };
    }
  }
}
