import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

/**
 * Application bootstrap entry point.
 *
 * Starts the NestJS HTTP server using the root AppModule, which wires the
 * domain modules together. Run with `npm run start` (or `start:dev`).
 */
export async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
