import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleDestroy,
} from '@nestjs/common';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;

@Injectable()
export class DatabaseService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool: Pool;
  private shuttingDown = false;
  private closePromise: Promise<void> | null = null;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX ?? 10),
      idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
      connectionTimeoutMillis: Number(
        process.env.DATABASE_CONNECTION_TIMEOUT_MS ?? 5_000,
      ),
    });

    this.pool.on('error', (err) => {
      this.logger.error(`Unexpected database pool error: ${err.message}`, err.stack);
    });
  }

  /**
   * Whether the service is accepting new work. Callers should check this before
   * starting long-running operations so shutdown can stop new work promptly.
   */
  isAcceptingWork(): boolean {
    return !this.shuttingDown;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    if (this.shuttingDown) {
      throw new Error('DatabaseService is shutting down; refusing new queries');
    }
    return this.pool.query<T>(text, params as never);
  }

  async getClient(): Promise<PoolClient> {
    if (this.shuttingDown) {
      throw new Error('DatabaseService is shutting down; refusing new clients');
    }
    return this.pool.connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }

  /**
   * Idempotent, time-bounded pool shutdown. Safe to call multiple times and
   * from multiple lifecycle hooks; concurrent callers share the same promise.
   */
  close(): Promise<void> {
    if (this.closePromise) {
      return this.closePromise;
    }

    this.shuttingDown = true;
    this.closePromise = this.doClose();
    return this.closePromise;
  }

  private async doClose(): Promise<void> {
    const timeoutMs = Number(
      process.env.DATABASE_SHUTDOWN_TIMEOUT_MS ?? DEFAULT_SHUTDOWN_TIMEOUT_MS,
    );

    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        this.logger.warn(
          `Database pool did not close within ${timeoutMs}ms; forcing shutdown`,
        );
        resolve();
      }, timeoutMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    });

    try {
      await Promise.race([this.pool.end(), timeout]);
      this.logger.log('Database pool closed');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Error closing database pool: ${message}`);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
