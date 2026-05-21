import { Test, TestingModule } from '@nestjs/testing';

import { PermissionsRepository } from './repositories/permissions.repository';
import { PermissionsService } from './permissions.service';

describe('PermissionsService', () => {
  let service: PermissionsService;
  let permissionsRepository: {
    listActivePermissions: jest.Mock;
  };

  beforeEach(async () => {
    permissionsRepository = {
      listActivePermissions: jest.fn().mockResolvedValue([
        {
          id: 1,
          key: 'roles.read',
          name: 'Roles Read',
          category: 'users_roles',
          description: null,
          isActive: true,
        },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionsService,
        {
          provide: PermissionsRepository,
          useValue: permissionsRepository,
        },
      ],
    }).compile();

    service = module.get<PermissionsService>(PermissionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('lists active permissions without internal flags', async () => {
    await expect(service.list()).resolves.toEqual({
      items: [
        {
          id: 1,
          key: 'roles.read',
          name: 'Roles Read',
          category: 'users_roles',
          description: null,
        },
      ],
    });
    expect(permissionsRepository.listActivePermissions).toHaveBeenCalled();
  });
});
