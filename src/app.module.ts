import { Module } from '@nestjs/common';
import { SignalsModule } from './signals/signals.module';
import { ProvidersModule } from './providers/providers.module';

/**
 * Root application module.
 *
 * Composes the domain modules. Each domain module owns its providers and
 * exports only what other modules need, keeping the dependency graph acyclic.
 */
@Module({
  imports: [SignalsModule, ProvidersModule],
})
export class AppModule {}
