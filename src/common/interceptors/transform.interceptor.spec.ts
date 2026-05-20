import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformInterceptor } from './transform.interceptor';

describe('TransformInterceptor', () => {
  let interceptor: TransformInterceptor<unknown>;

  beforeEach(() => {
    interceptor = new TransformInterceptor();
  });

  it('should transform response structure and append timestamp in meta', (done) => {
    const mockData = { id: 1, name: 'NestJS' };
    const handleMock = jest.fn().mockReturnValue(of(mockData));
    const mockCallHandler = {
      handle: handleMock,
    } as unknown as CallHandler;

    const mockContext = {} as unknown as ExecutionContext;

    interceptor.intercept(mockContext, mockCallHandler).subscribe({
      next: (response) => {
        expect(handleMock).toHaveBeenCalled();
        expect(response).toEqual({
          data: mockData,
          meta: {
            timestamp: expect.any(String) as string,
          },
        });

        // Ensure timestamp is a valid ISO string
        expect(new Date(response.meta.timestamp).toString()).not.toBe(
          'Invalid Date',
        );
        done();
      },
      error: (error) => {
        done(error);
      },
    });
  });
});
