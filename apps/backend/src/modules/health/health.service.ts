import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  check() {
    return {
      status: 'ok',
      service: 'port-102-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
