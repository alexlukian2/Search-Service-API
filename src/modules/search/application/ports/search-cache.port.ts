import { SearchResultEntity } from '../../domain/entities/search-result.entity';

export interface ISearchCachePort {
  getCachedSearch(query: string): Promise<SearchResultEntity | null>;
  cacheSearchResult(query: string, data: SearchResultEntity): Promise<void>;
  incrementQueryStats(query: string): Promise<void>;
  getTopQueries(limit: number): Promise<{ query: string; count: number }[]>;
  getTopQueriesRaw(limit: number): Promise<string[]>;
  savePopularQueries(queries: string[]): Promise<void>;
  checkCacheExists(query: string): Promise<boolean>;
  invalidateCache(query: string): Promise<boolean>;
}

export const SEARCH_CACHE_PORT = Symbol('SEARCH_CACHE_PORT');
