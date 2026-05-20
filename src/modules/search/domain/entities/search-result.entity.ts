export class SearchResultEntity {
  query: string;
  results: string[];
  timestamp: string;

  constructor(partial: Partial<SearchResultEntity>) {
    Object.assign(this, partial);
  }
}
