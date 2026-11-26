import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { prisma } from '@servicegrid/database';

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
  @ApiOperation({ summary: 'Readiness probe (verifies database when DATABASE_URL is set)' })
  async getReadiness() {
    let database = 'skipped';
    if (process.env.DATABASE_URL) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        database = 'connected';
      } catch {
        throw new ServiceUnavailableException('Database readiness check failed');
      }
    }

    return {
      success: true,
      data: {
        status: 'ready',
        database,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
