import { Injectable } from '@nestjs/common';

import { PermissionsRepository } from './repositories/permissions.repository';

@Injectable()
export class PermissionsService {
  constructor(private readonly permissionsRepository: PermissionsRepository) {}

  async list() {
    const permissions =
      await this.permissionsRepository.listActivePermissions();

    return {
      items: permissions.map((permission) => ({
        id: permission.id,
        key: permission.key,
        name: permission.name,
        category: permission.category,
        description: permission.description,
      })),
    };
  }
}
