import { Controller, Get, HttpCode } from '@nestjs/common';

export interface LivenessResponse {
  status: 'ok';
}

@Controller('health')
export class HealthController {
  @Get('live')
  @HttpCode(200)
  getLiveness(): LivenessResponse {
    return { status: 'ok' };
  }
}
