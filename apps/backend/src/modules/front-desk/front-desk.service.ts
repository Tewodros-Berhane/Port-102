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
