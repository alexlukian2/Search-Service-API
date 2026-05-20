import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

describe('Exception Filters', () => {
  let mockResponse: {
    status: jest.Mock;
    json: jest.Mock;
  };
  let mockRequest: {
    url: string;
    method: string;
  };
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    mockRequest = {
      url: '/test-url',
      method: 'GET',
    };
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    } as unknown as ArgumentsHost;
  });

  describe('AllExceptionsFilter', () => {
    let filter: AllExceptionsFilter;

    beforeEach(() => {
      filter = new AllExceptionsFilter();
    });

    it('should handle HttpException correctly', () => {
      const exception = new HttpException(
        'Custom HTTP Error',
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.BAD_REQUEST,
        timestamp: expect.any(String) as string,
        path: '/test-url',
        message: 'Custom HTTP Error',
      });
    });

    it('should handle standard Error as internal server error', () => {
      const exception = new Error('Database connection failed');

      // Temporarily mock console.error or logger.error if we want to avoid cluttering test outputs
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String) as string,
        path: '/test-url',
        message: 'Internal server error',
      });
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });

    it('should handle unknown exception types as internal server error', () => {
      const exception = 'weird string exception';
      const loggerSpy = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation();

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        timestamp: expect.any(String) as string,
        path: '/test-url',
        message: 'Internal server error',
      });
      expect(loggerSpy).toHaveBeenCalled();
      loggerSpy.mockRestore();
    });
  });
});
