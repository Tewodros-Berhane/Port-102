import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import { Request, Response } from 'express';

type ExceptionBody = {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  timestamp: string;
  path: string;
};

type HttpExceptionResponse = {
  error?: unknown;
  message?: unknown;
  statusCode?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  catch(exception: HttpException, host: ArgumentsHost) {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();
    const request = httpContext.getRequest<Request>();
    const statusCode = exception.getStatus();
    const exceptionResponse = exception.getResponse();
    const normalized = this.normalizeExceptionResponse(exceptionResponse);

    const body: ExceptionBody = {
      success: false,
      statusCode,
      error: normalized.error ?? exception.name,
      message: normalized.message ?? exception.message,
      timestamp: new Date().toISOString(),
      path: request.originalUrl || request.url,
    };

    response.status(statusCode).json(body);
  }

  private normalizeExceptionResponse(
    exceptionResponse: string | object,
  ): Partial<Pick<ExceptionBody, 'error' | 'message'>> {
    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
      };
    }

    if (!isRecord(exceptionResponse)) {
      return {};
    }

    const response = exceptionResponse as HttpExceptionResponse;

    return {
      error: typeof response.error === 'string' ? response.error : undefined,
      message: this.normalizeMessage(response.message),
    };
  }

  private normalizeMessage(value: unknown): string | string[] | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === 'string')
    ) {
      return value;
    }

    return undefined;
  }
}
