import { REQUIRED_PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

describe('DepartmentsController', () => {
  const service = {
    create: jest.fn(),
    list: jest.fn(),
    getById: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new DepartmentsController(
    service as unknown as DepartmentsService,
  );
  const user = {
    sub: 1,
    email: 'admin@test.com',
    roleKey: 'HOTEL_ADMIN',
    roleId: 2,
    departmentId: null,
    tokenVersion: 0,
  };
  it('delegates CRUD operations', async () => {
    const create = { key: 'FINANCE', name: 'Finance' };
    const query = { page: 1, limit: 20 };
    await controller.create(user, create);
    await controller.list(user, query);
    await controller.getById(user, 2);
    await controller.update(user, 2, { name: 'Accounting' });
    await controller.remove(user, 2);
    expect(service.create).toHaveBeenCalledWith(user, create);
    expect(service.list).toHaveBeenCalledWith(user, query);
    expect(service.remove).toHaveBeenCalledWith(user, 2);
  });
  it.each([
    ['create', 'departments.create'],
    ['list', 'departments.read'],
    ['getById', 'departments.read'],
    ['update', 'departments.update'],
    ['remove', 'departments.delete'],
  ])('requires the correct permission on %s', (method, permission) => {
    expect(
      Reflect.getMetadata(
        REQUIRED_PERMISSIONS_KEY,
        DepartmentsController.prototype[method as keyof DepartmentsController],
      ),
    ).toEqual([permission]);
  });
});
