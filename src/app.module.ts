import { Module } from '@nestjs/common';
import { SignalsModule } from './signals/signals.module';
import { ProvidersModule } from './providers/providers.module';

/**
 * Root application module.
 *
 * Composes the domain modules. Each domain module owns its providers and
 * exports only what other modules need, keeping the dependency graph acyclic.
 *
 * API versioning strategy (see main.ts):
 * - URI-based versioning: routes are served under `/v<version>/...`.
 * - The default version is `1`, so unversioned requests resolve to `v1`.
 * - Unsupported/unknown versions do not match any route and return a 404.
 */
@Module({
  imports: [SignalsModule, ProvidersModule],
})
export class AppModule {}
