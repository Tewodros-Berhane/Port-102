import { BadRequestException, Injectable } from '@nestjs/common';

import type { CurrentUserPayload } from '../auth/types/current-user-payload.type';
import {
  FrontDeskArrivalsQueryDto,
  FrontDeskDashboardQueryDto,
  FrontDeskDeparturesQueryDto,
  FrontDeskInHouseQueryDto,
} from './dto/front-desk-query.dto';
import {
  FrontDeskRepository,
  FrontDeskStayRecord,
} from './repositories/front-desk.repository';

@Injectable()
export class FrontDeskService {
  constructor(private readonly frontDeskRepository: FrontDeskRepository) {}

  async getDashboard(
    _currentUser: CurrentUserPayload,
    query: FrontDeskDashboardQueryDto,
  ) {
    const { date, startDate, endDate } = this.resolveOperationalDateRange(
      query.date,
    );
    const counts = await this.frontDeskRepository.getDashboardCounts({
      startDate,
      endDate,
    });

    return {
      date,
      ...counts,
    };
  }

  async listArrivals(
    _currentUser: CurrentUserPayload,
    query: FrontDeskArrivalsQueryDto,
  ) {
    const { date, startDate, endDate } = this.resolveOperationalDateRange(
      query.date,
    );
    const { page, limit, skip, search } = this.resolveListQuery(query);
    const [total, reservations] = await this.frontDeskRepository.listArrivals({
      skip,
      take: limit,
      startDate,
      endDate,
      search,
    });

    return {
      date,
      items: reservations,
      pagination: this.buildPagination({ page, limit, total }),
    };
  }

  async listDepartures(
    _currentUser: CurrentUserPayload,
    query: FrontDeskDeparturesQueryDto,
  ) {
    const { date, startDate, endDate } = this.resolveOperationalDateRange(
      query.date,
    );
    const { page, limit, skip, search } = this.resolveListQuery(query);
    const [total, stays] = await this.frontDeskRepository.listDepartures({
      skip,
      take: limit,
      startDate,
      endDate,
      search,
    });

    return {
      date,
      items: stays.map((stay) => this.serializeFrontDeskStay(stay)),
      pagination: this.buildPagination({ page, limit, total }),
    };
  }

  async listInHouse(
    _currentUser: CurrentUserPayload,
    query: FrontDeskInHouseQueryDto,
  ) {
    const { page, limit, skip, search } = this.resolveListQuery(query);
    const [total, stays] = await this.frontDeskRepository.listInHouse({
      skip,
      take: limit,
      search,
    });

    return {
      items: stays.map((stay) => this.serializeFrontDeskStay(stay)),
      pagination: this.buildPagination({ page, limit, total }),
    };
  }

  private serializeFrontDeskStay(stay: FrontDeskStayRecord) {
    return {
      id: stay.id,
      stayNumber: stay.stayNumber,
      reservationId: stay.reservationId,
      guestId: stay.guestId,
      status: stay.status,
      checkedInAt: stay.checkedInAt,
      expectedCheckOutDate: stay.expectedCheckOutDate,
      checkedOutAt: stay.checkedOutAt,
      notes: stay.notes,
      createdAt: stay.createdAt,
      updatedAt: stay.updatedAt,
      guest: stay.guest,
      reservation: stay.reservation,
      currentRooms: stay.roomAssignments.map((assignment) => ({
        assignmentId: assignment.id,
        roomId: assignment.roomId,
        reservationRoomId: assignment.reservationRoomId,
        assignedAt: assignment.assignedAt,
        room: assignment.room,
        reservationRoom: assignment.reservationRoom,
      })),
    };
  }

  private resolveListQuery(query: {
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    return {
      page,
      limit,
      skip: (page - 1) * limit,
      search: this.normalizeOptionalString(query.search),
    };
  }

  private buildPagination({
    page,
    limit,
    total,
  }: {
    page: number;
    limit: number;
    total: number;
  }) {
    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  private resolveOperationalDateRange(value?: string) {
    const startDate = value
      ? this.parseOperationalDate(value)
      : this.startOfLocalDay(new Date());
