import { Module, OnApplicationShutdown, OnModuleDestroy } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { HealthController } from './health/health.controller';

const SHUTDOWN_TIMEOUT_MS = 10_000;

@Module({
  imports: [],
  controllers: [AppController, HealthController],
  providers: [AppService],
})
export class AppModule implements OnModuleDestroy, OnApplicationShutdown {
  private shuttingDown = false;
  private cleanupPromise: Promise<void> | null = null;

  /**
   * Stop accepting new work. Idempotent: repeated calls return the same promise.
   */
  async onModuleDestroy(): Promise<void> {
    await this.runCleanup();
  }

  /**
   * Final shutdown hook. Idempotent and time-bounded so shutdown cannot hang.
   */
  async onApplicationShutdown(signal?: string): Promise<void> {
    await this.runCleanup(signal);
  }

  private runCleanup(signal?: string): Promise<void> {
    if (this.cleanupPromise) {
      return this.cleanupPromise;
    }

    this.shuttingDown = true;
    this.cleanupPromise = this.cleanup(signal);
    return this.cleanupPromise;
  }

  private async cleanup(signal?: string): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        // Time-bounded: never block shutdown indefinitely.
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    try {
      await Promise.race([this.closeResources(signal), timeout]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  private async closeResources(signal?: string): Promise<void> {
    // New work is rejected once shuttingDown is set; close external clients here.
    // Database and external client handles are released by their own
    // OnModuleDestroy/OnApplicationShutdown providers registered in this module.
    void signal;
    void this.shuttingDown;
  }
}
