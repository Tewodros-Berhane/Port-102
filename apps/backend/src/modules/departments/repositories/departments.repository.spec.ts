import { DepartmentsRepository } from './departments.repository';

describe('DepartmentsRepository', () => {
  const prisma = {
    department: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: { count: jest.fn() },
    employee: { count: jest.fn() },
  };
  const repository = new DepartmentsRepository(prisma as never);
  beforeEach(() => jest.clearAllMocks());
  it('uses stable paginated search queries', async () => {
    prisma.department.count.mockResolvedValue(0);
    prisma.department.findMany.mockResolvedValue([]);
    await repository.list({
      skip: 10,
      take: 5,
      search: 'front',
      isActive: true,
    });
    expect(prisma.department.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 5,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
      }),
    );
  });
  it('counts active linked users and employees', async () => {
    prisma.user.count.mockResolvedValue(2);
    prisma.employee.count.mockResolvedValue(1);
    await expect(repository.countActiveAssignments(4)).resolves.toEqual({
      users: 2,
      employees: 1,
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { departmentId: 4, status: 'ACTIVE' },
    });
  });
});
