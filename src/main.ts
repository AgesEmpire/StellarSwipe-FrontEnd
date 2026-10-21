import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppModule } from './app.module';

const CORRELATION_ID_HEADER = 'x-correlation-id';
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;

function resolveCorrelationId(value: unknown): string {
  if (typeof value === 'string' && CORRELATION_ID_PATTERN.test(value)) {
    return value;
  }
  return randomUUID();
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use((req: any, res: any, next: () => void) => {
    const correlationId = resolveCorrelationId(req.headers[CORRELATION_ID_HEADER]);
    req.correlationId = correlationId;
    res.setHeader(CORRELATION_ID_HEADER, correlationId);
    console.log(
      `[${correlationId}] ${req.method} ${req.originalUrl ?? req.url}`,
    );
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
