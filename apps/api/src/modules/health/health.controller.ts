import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  getLiveness() {
    return {
      success: true,
      data: {
        status: 'ok',
        service: 'fieldsutra-api',
        timestamp: new Date().toISOString(),
        uptimeSeconds: Math.round(process.uptime()),
      },
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe' })
  getReadiness() {
    return {
      success: true,
      data: {
        status: 'ready',
        timestamp: new Date().toISOString(),
      },
    };
  }
}
