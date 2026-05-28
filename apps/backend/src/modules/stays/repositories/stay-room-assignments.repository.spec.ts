import { StayRoomAssignmentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { StayRoomAssignmentsRepository } from './stay-room-assignments.repository';

describe('StayRoomAssignmentsRepository', () => {
  const stayRoomAssignment = {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  };
  const prisma = {
    stayRoomAssignment,
  } as unknown as PrismaService;
  let repository: StayRoomAssignmentsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    repository = new StayRoomAssignmentsRepository(prisma);
  });

  it('creates a stay room assignment with the standard projection', async () => {
    const payload = {
      stayId: 1,
      roomId: 101,
      reservationRoomId: 24,
      assignedByUserId: 7,
    };

    await repository.createAssignment(payload);

    expect(stayRoomAssignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: payload,
        select: expect.objectContaining({
          id: true,
          stayId: true,
          room: expect.any(Object),
        }),
      }),
    );
  });

  it('lists active assignments for one stay', async () => {
    await repository.listActiveAssignmentsForStay(1);

    expect(stayRoomAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          stayId: 1,
          status: StayRoomAssignmentStatus.ACTIVE,
        },
        orderBy: [{ assignedAt: 'asc' }, { id: 'asc' }],
      }),
    );
  });

  it('updates one assignment by id', async () => {
    const data = {
      status: StayRoomAssignmentStatus.RELEASED,
      releasedByUserId: 9,
    };

    await repository.updateAssignment(31, data);

    expect(stayRoomAssignment.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 31,
        },
        data,
      }),
    );
  });
});
