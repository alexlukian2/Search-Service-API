import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { SEARCH_CACHE_PORT } from '../ports/search-cache.port';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';

describe('SearchService', () => {
  let service: SearchService;
  let cachePortMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    cachePortMock = {
      getCachedSearch: jest.fn(),
      cacheSearchResult: jest.fn(),
      incrementQueryStats: jest.fn(),
      getTopQueries: jest.fn(),
      getTopQueriesRaw: jest.fn(),
      savePopularQueries: jest.fn(),
      checkCacheExists: jest.fn(),
      invalidateCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: SEARCH_CACHE_PORT,
          useValue: cachePortMock,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('search', () => {
    const query = 'test';

    it('should return cached result if it exists', async () => {
      const cachedEntity = new SearchResultEntity({
        query,
        results: ['result1', 'result2'],
        timestamp: new Date().toISOString(),
      });
      cachePortMock.getCachedSearch.mockResolvedValue(cachedEntity);

      const result = await service.search(query);

      expect(cachePortMock.incrementQueryStats).toHaveBeenCalledWith(query);
      expect(cachePortMock.getCachedSearch).toHaveBeenCalledWith(query);
      expect(result).toBe(cachedEntity);
      expect(cachePortMock.cacheSearchResult).not.toHaveBeenCalled();
    });

    it('should simulate search, cache, and return new result on cache miss', async () => {
      cachePortMock.getCachedSearch.mockResolvedValue(null);
      cachePortMock.cacheSearchResult.mockResolvedValue(undefined);

      const start = Date.now();
      const result = await service.search(query);
      const end = Date.now();

      expect(cachePortMock.incrementQueryStats).toHaveBeenCalledWith(query);
      expect(cachePortMock.getCachedSearch).toHaveBeenCalledWith(query);
      expect(cachePortMock.cacheSearchResult).toHaveBeenCalledWith(
        query,
        expect.any(SearchResultEntity),
      );
      expect(result.query).toBe(query);
      expect(result.results).toEqual([
        `Result 1 for ${query}`,
        `Result 2 for ${query}`,
        `Result 3 for ${query}`,
      ]);
      // Simulation delay should be >= 2000ms
      expect(end - start).toBeGreaterThanOrEqual(1900);
    }, 5000); // 5s timeout
  });

  describe('getStats', () => {
    it('should return top queries from cache port', async () => {
      const mockStats = [
        { query: 'nest', count: 10 },
        { query: 'redis', count: 5 },
      ];
      cachePortMock.getTopQueries.mockResolvedValue(mockStats);

      const result = await service.getStats();

      expect(cachePortMock.getTopQueries).toHaveBeenCalled();
      expect(result).toEqual({ topQueries: mockStats });
    });
  });

  describe('precache', () => {
    it('should return message if no queries are available and top queries are empty', async () => {
      cachePortMock.getTopQueriesRaw.mockResolvedValue([]);

      const result = await service.precache();

      expect(result).toEqual({ message: 'No queries to precache.' });
      expect(cachePortMock.savePopularQueries).not.toHaveBeenCalled();
    });

    it('should precache provided queries and only search for uncached ones', async () => {
      const queries = ['nest', 'redis'];
      cachePortMock.checkCacheExists.mockImplementation((q: string) => {
        return Promise.resolve(q === 'nest'); // 'nest' is cached, 'redis' is not
      });
      cachePortMock.getCachedSearch.mockResolvedValue(null); // for 'redis' cache miss

      const result = await service.precache(queries);

      expect(cachePortMock.savePopularQueries).toHaveBeenCalledWith(queries);
      expect(cachePortMock.checkCacheExists).toHaveBeenCalledWith('nest');
      expect(cachePortMock.checkCacheExists).toHaveBeenCalledWith('redis');
      expect(result.totalProcessed).toBe(2);
      expect(result.newlyCached).toBe(1);
      expect(result.queries).toEqual(queries);
    }, 5000);
  });

  describe('invalidateCache', () => {
    const query = 'clear-me';

    it('should return success message if cache was invalidated', async () => {
      cachePortMock.invalidateCache.mockResolvedValue(true);

      const result = await service.invalidateCache(query);

      expect(cachePortMock.invalidateCache).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        message: `Cache invalidated for query: "${query}"`,
      });
    });

    it('should return warning/info message if no cache was found', async () => {
      cachePortMock.invalidateCache.mockResolvedValue(false);

      const result = await service.invalidateCache(query);

      expect(cachePortMock.invalidateCache).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        message: `No cache found for query: "${query}"`,
      });
    });
  });
});
