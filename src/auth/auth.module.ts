import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { WalletAuthGuard } from './wallet-auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN ?? '1h' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    WalletAuthGuard,
    {
      provide: APP_GUARD,
      useExisting: WalletAuthGuard,
    },
  ],
  exports: [AuthService, WalletAuthGuard],
})
export class AuthModule {}
