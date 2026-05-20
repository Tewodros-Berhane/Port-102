import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type ResponsePayload = {
  success: true;
  statusCode: number;
  message: string;
  data: unknown;
  meta?: unknown;
  timestamp: string;
  path: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwnProperty(value: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponsePayload> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((payload: unknown) => {
        const body: ResponsePayload = {
          success: true,
          statusCode: response.statusCode,
          message: this.getMessage(payload),
          data: this.getData(payload),
          timestamp: new Date().toISOString(),
          path: request.originalUrl || request.url,
        };

        const meta = this.getMeta(payload);

        if (meta !== undefined) {
          body.meta = meta;
        }

        return body;
      }),
    );
  }

  private getData(payload: unknown): unknown {
    if (isRecord(payload) && hasOwnProperty(payload, 'data')) {
      return payload.data;
    }

    return payload ?? null;
  }

  private getMeta(payload: unknown): unknown {
    if (isRecord(payload) && hasOwnProperty(payload, 'meta')) {
      return payload.meta;
    }

    return undefined;
  }

  private getMessage(payload: unknown): string {
    if (
      isRecord(payload) &&
      hasOwnProperty(payload, 'message') &&
      typeof payload.message === 'string'
    ) {
      return payload.message;
    }

    return 'Request successful';
  }
}
