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
import { PrecacheDto } from './dto/precache.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';

@ApiTags('search')
@Controller()
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('search')
  @ApiOperation({
    summary: 'Search for a query, with Redis caching and artificial delay',
  })
  @ApiQuery({ name: 'q', required: true, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Search results' })
  async search(@Query('q') q: string) {
    if (!q || q.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.searchService.search(q.trim().toLowerCase());
  }

  @Post('precache')
  @ApiOperation({ summary: 'Pre-cache popular queries' })
  @ApiResponse({ status: 201, description: 'Pre-caching started/completed' })
  async precache(@Body() precacheDto: PrecacheDto) {
    return this.searchService.precache(precacheDto.queries);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get top 10 most frequent search queries in the last 24h',
  })
  @ApiResponse({ status: 200, description: 'Stats data' })
  async getStats() {
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
  async invalidateCache(@Query('q') q: string) {
    if (!q || q.trim() === '') {
      throw new BadRequestException('Query parameter "q" is required');
    }
    return this.searchService.invalidateCache(q.trim().toLowerCase());
  }
}
