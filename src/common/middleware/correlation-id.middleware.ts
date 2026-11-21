import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'crypto';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

// Accept only reasonably safe correlation IDs: 1-128 chars of alphanumerics,
// dashes, underscores, dots, or colons. Anything else is treated as malformed.
const VALID_CORRELATION_ID = /^[A-Za-z0-9._:-]{1,128}$/;

export function resolveCorrelationId(incoming?: string | string[]): string {
  const candidate = Array.isArray(incoming) ? incoming[0] : incoming;
  if (typeof candidate === 'string' && VALID_CORRELATION_ID.test(candidate)) {
    return candidate;
  }
  return randomUUID();
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const correlationId = resolveCorrelationId(
      req.headers[CORRELATION_ID_HEADER] as string | string[] | undefined,
    );

    req.headers[CORRELATION_ID_HEADER] = correlationId;
    (req as Request & { correlationId?: string }).correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    console.log(
      `[${correlationId}] ${req.method} ${req.originalUrl ?? req.url}`,
    );

    next();
  }
}
