import { Injectable, NotFoundException } from '@nestjs/common';
import { StayStatus } from '../../generated/prisma/client';
import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import { CheckInReservationDto } from './dto/check-in-reservation.dto';
import { GetStaysQueryDto } from './dto/get-stays-query.dto';
import { StayRoomAssignmentsRepository } from './repositories/stay-room-assignments.repository';
import { StaysRepository } from './repositories/stays.repository';
@Injectable()
export class StaysService {
  constructor(
    private readonly staysRepository: StaysRepository,
    private readonly stayRoomAssignmentsRepository: StayRoomAssignmentsRepository,
  ) {}
  list(_currentUser: CurrentUserPayload, _query: GetStaysQueryDto) {
    return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  }
  async getById(_currentUser: CurrentUserPayload, stayId: number) {
    const stay = await this.staysRepository.findStay(stayId);
    if (!stay) {
      throw new NotFoundException('Stay was not found.');
    }
    return stay;
  }
  listActive(currentUser: CurrentUserPayload, query: GetStaysQueryDto) {
    return this.list(currentUser, { ...query, status: StayStatus.ACTIVE });
  }
  listInHouseGuests(currentUser: CurrentUserPayload, query: GetStaysQueryDto) {
    return this.listActive(currentUser, query);
  }
  checkInReservation(
    _currentUser: CurrentUserPayload,
    _reservationId: number,
    _checkInReservationDto: CheckInReservationDto,
  ) {
    return { id: _reservationId };
  }
}