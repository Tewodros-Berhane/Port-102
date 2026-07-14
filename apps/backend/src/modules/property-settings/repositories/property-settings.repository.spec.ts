import { PropertySettingsRepository } from './property-settings.repository';
describe('PropertySettingsRepository', () => {
  it('uses stable singleton id one', async () => {
    const prisma = {
      hotel: {
        findUnique: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
      },
    };
    const repository = new PropertySettingsRepository(prisma as never);
    await repository.find();
    expect(prisma.hotel.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
