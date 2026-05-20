import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health' })
  @ApiOkResponse({
    description: 'The API is running.',
    schema: {
      example: {
        success: true,
        statusCode: 200,
        message: 'Request successful',
        data: {
          status: 'ok',
          service: 'port-102-backend',
          timestamp: '2026-05-19T00:00:00.000Z',
        },
        timestamp: '2026-05-19T00:00:00.000Z',
        path: '/api/health',
      },
    },
  })
  check() {
    return this.healthService.check();
  }
}
