import { SearchResultEntity } from './search-result.entity';

describe('SearchResultEntity', () => {
  it('should successfully create an instance with valid props', () => {
    const props = {
      query: 'test',
      results: ['a', 'b'],
      timestamp: new Date().toISOString(),
    };

    const entity = new SearchResultEntity(props);

    expect(entity.query).toBe(props.query);
    expect(entity.results).toEqual(props.results);
    expect(entity.timestamp).toBe(props.timestamp);
  });

  it('should throw an error if query is empty or whitespaces only', () => {
    expect(() => {
      new SearchResultEntity({
        query: '',
        results: [],
        timestamp: new Date().toISOString(),
      });
    }).toThrow('SearchResultEntity: query must not be empty');

    expect(() => {
      new SearchResultEntity({
        query: '   ',
        results: [],
        timestamp: new Date().toISOString(),
      });
    }).toThrow('SearchResultEntity: query must not be empty');
  });

  it('should throw an error if results is not an array', () => {
    expect(() => {
      new SearchResultEntity({
        query: 'test',
        results: null as unknown as string[],
        timestamp: new Date().toISOString(),
      });
    }).toThrow('SearchResultEntity: results must be an array');
  });

  it('should throw an error if timestamp is missing', () => {
    expect(() => {
      new SearchResultEntity({
        query: 'test',
        results: [],
        timestamp: null as unknown as string,
      });
    }).toThrow('SearchResultEntity: timestamp is required');
  });

  it('should freeze the results array to guarantee immutability', () => {
    const props = {
      query: 'test',
      results: ['a', 'b'],
      timestamp: new Date().toISOString(),
    };

    const entity = new SearchResultEntity(props);

    expect(Object.isFrozen(entity.results)).toBe(true);

    expect(() => {
      (entity.results as string[])[0] = 'changed';
    }).toThrow();
  });
});
