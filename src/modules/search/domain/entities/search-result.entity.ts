export interface SearchResultProps {
  readonly query: string;
  readonly results: readonly string[];
  readonly timestamp: string;
}

export class SearchResultEntity {
  readonly query: string;
  readonly results: readonly string[];
  readonly timestamp: string;

  constructor(props: SearchResultProps) {
    this.validateProps(props);

    this.query = props.query;
    this.results = Object.freeze([...props.results]);
    this.timestamp = props.timestamp;
  }

  private validateProps(props: SearchResultProps): void {
    if (!props.query || props.query.trim().length === 0) {
      throw new Error('SearchResultEntity: query must not be empty');
    }

    if (!Array.isArray(props.results)) {
      throw new Error('SearchResultEntity: results must be an array');
    }

    if (!props.timestamp) {
      throw new Error('SearchResultEntity: timestamp is required');
    }
  }
}
