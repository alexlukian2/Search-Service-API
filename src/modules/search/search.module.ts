import { Module } from '@nestjs/common';
import { SearchService } from './application/services/search.service';
import { SearchController } from './presentation/http/search.controller';
import { RedisSearchCacheAdapter } from './infrastructure/adapters/redis-search-cache.adapter';
import { SEARCH_CACHE_PORT } from './application/ports/search-cache.port';

@Module({
  controllers: [SearchController],
  providers: [
    SearchService,
    {
      provide: SEARCH_CACHE_PORT,
      useClass: RedisSearchCacheAdapter,
    },
  ],
  exports: [SearchService],
})
export class SearchModule {}
