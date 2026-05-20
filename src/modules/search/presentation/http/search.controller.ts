import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { SearchService } from '../../application/services/search.service';
import { PrecacheRequestDto } from './dto/precache-request.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { SearchResultEntity } from '../../domain/entities/search-result.entity';
import { SEARCH_QUERY_MAX_LENGTH } from '../../infrastructure/constants/search.constants';

@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({
    summary: 'Search for a query, with Redis caching and artificial delay',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') q: string): Promise<SearchResultEntity> {
    if (!q || q.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const sanitized = q.trim().toLowerCase();

    if (sanitized.length > SEARCH_QUERY_MAX_LENGTH) {
      throw new BadRequestException(
        `Query must not exceed ${SEARCH_QUERY_MAX_LENGTH} characters`,
      );
    }

    return this.searchService.search(sanitized);
  }

  @Post('precache')
  @ApiOperation({ summary: 'Pre-cache popular queries' })
  @ApiResponse({ status: 201, description: 'Pre-caching started/completed' })
  async precache(@Body() precacheDto: PrecacheRequestDto): Promise<object> {
    return this.searchService.precache(precacheDto.queries);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get top 10 most frequent search queries',
  })
  @ApiResponse({ status: 200, description: 'Stats data' })
  async getStats(): Promise<object> {
    return this.searchService.getStats();
  }

  @Delete('cache')
  @ApiOperation({ summary: 'Invalidate cache for a specific query' })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query to invalidate',
  })
  @ApiResponse({ status: 200, description: 'Cache invalidated' })
  async invalidateCache(@Query('q') q: string): Promise<object> {
    if (!q || q.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const sanitized = q.trim().toLowerCase();

    if (sanitized.length > SEARCH_QUERY_MAX_LENGTH) {
      throw new BadRequestException(
        `Query must not exceed ${SEARCH_QUERY_MAX_LENGTH} characters`,
      );
    }

    return this.searchService.invalidateCache(sanitized);
  }
}
