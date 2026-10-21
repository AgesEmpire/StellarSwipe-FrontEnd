import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable graceful shutdown so SIGTERM/SIGINT trigger lifecycle hooks
  // (OnModuleDestroy / OnApplicationShutdown) that stop new work and
  // close database and external client connections.
  app.enableShutdownHooks();

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
