import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * Application bootstrap entry point.
 *
 * Starts the NestJS HTTP server using the root AppModule, which wires the
 * domain modules together. Run with `npm run start` (or `start:dev`).
 *
 * API versioning strategy:
 * - URI-based versioning: clients select a version via the URL prefix
 *   (e.g. `/v1/...`).
 * - The default version is `1`, so unversioned requests resolve to `v1`
 *   predictably instead of silently falling through.
 * - Unsupported/unknown versions (e.g. `/v2/...`) do not match any route and
 *   return a predictable `404 Not Found`.
 */
export const DEFAULT_API_VERSION = '1';

export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: DEFAULT_API_VERSION,
  });

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
