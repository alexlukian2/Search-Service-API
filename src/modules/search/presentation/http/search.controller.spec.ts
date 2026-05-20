import { Test, TestingModule } from '@nestjs/testing';
import { SearchController } from './search.controller';
import { SearchService } from '../../application/services/search.service';
import { BadRequestException } from '@nestjs/common';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';

describe('SearchController', () => {
  let controller: SearchController;
  let serviceMock: Record<string, jest.Mock>;

  beforeEach(async () => {
    serviceMock = {
      search: jest.fn(),
      precache: jest.fn(),
      getStats: jest.fn(),
      invalidateCache: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: serviceMock,
        },
      ],
    }).compile();

    controller = module.get<SearchController>(SearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('search', () => {
    it('should call service search with sanitized query and return result', async () => {
      const mockResult = new SearchResultEntity({
        query: 'nest',
        results: ['res'],
        timestamp: new Date().toISOString(),
      });
      serviceMock.search.mockResolvedValue(mockResult);

      const result = await controller.search('  NEST  ');

      expect(serviceMock.search).toHaveBeenCalledWith('nest');
      expect(result).toBe(mockResult);
    });

    it('should throw BadRequestException on empty query', async () => {
      await expect(controller.search('')).rejects.toThrow(BadRequestException);
      await expect(controller.search('   ')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on too long query', async () => {
      const longQuery = 'a'.repeat(201);
      await expect(controller.search(longQuery)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('precache', () => {
    it('should call service precache with DTO queries', async () => {
      const dto = { queries: ['nest', 'redis'] };
      const expectedResponse = { message: 'Success' };
      serviceMock.precache.mockResolvedValue(expectedResponse);

      const result = await controller.precache(dto);

      expect(serviceMock.precache).toHaveBeenCalledWith(dto.queries);
      expect(result).toBe(expectedResponse);
    });
  });

  describe('getStats', () => {
    it('should call service getStats and return results', async () => {
      const expectedResponse = { topQueries: [] };
      serviceMock.getStats.mockResolvedValue(expectedResponse);

      const result = await controller.getStats();

      expect(serviceMock.getStats).toHaveBeenCalled();
      expect(result).toBe(expectedResponse);
    });
  });

  describe('invalidateCache', () => {
    it('should call service invalidateCache with sanitized query', async () => {
      const expectedResponse = { message: 'Cache invalidated' };
      serviceMock.invalidateCache.mockResolvedValue(expectedResponse);

      const result = await controller.invalidateCache('  NEST  ');

      expect(serviceMock.invalidateCache).toHaveBeenCalledWith('nest');
      expect(result).toBe(expectedResponse);
    });

    it('should throw BadRequestException on empty query', async () => {
      await expect(controller.invalidateCache('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException on too long query', async () => {
      const longQuery = 'a'.repeat(201);
      await expect(controller.invalidateCache(longQuery)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
