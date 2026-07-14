import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { Permissions } from '../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ArrivalsDeparturesQueryDto,
  DailySummaryQueryDto,
  DepartmentPerformanceQueryDto,
  ExecutiveDashboardQueryDto,
  InventoryReportQueryDto,
  OccupancyReportQueryDto,
  OperationsExceptionsQueryDto,
  OutletSalesReportQueryDto,
  PaymentSummaryQueryDto,
  ProcurementReportQueryDto,
  ReportDateRangeQueryDto,
  RevenueReportQueryDto,
  RoomStatusReportQueryDto,
} from './dto/report-query.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @Permissions('reports.dashboard.read')
  @ApiOperation({
    summary: 'Get the consolidated executive management dashboard',
  })
  @ApiOkResponse({
    description: 'Current room, front-desk, financial, and operational KPIs.',
  })
  dashboard(@Query() query: ExecutiveDashboardQueryDto) {
    return this.reportsService.getDashboard(query);
  }

  @Get('daily-summary')
  @Permissions('reports.daily_summary.read')
  @ApiOperation({ summary: 'Get a daily hotel operating summary' })
  @ApiOkResponse({
    description: 'Daily cross-department activity and financial totals.',
  })
  dailySummary(@Query() query: DailySummaryQueryDto) {
    return this.reportsService.getDailySummary(query);
  }

  @Get('exceptions')
  @Permissions('reports.dashboard.read')
  @ApiOperation({ summary: 'Get management exceptions requiring attention' })
  @ApiOkResponse({ description: 'Exceptions grouped by operating area.' })
  exceptions(@Query() query: OperationsExceptionsQueryDto) {
    return this.reportsService.getExceptions(query);
  }

  @Get('occupancy')
  @Permissions('reports.occupancy.read')
  @ApiOperation({ summary: 'Get current and period occupancy reporting' })
  @ApiOkResponse({
    description:
      'Sellable-room occupancy, room nights, room types, and time series.',
  })
  occupancy(@Query() query: OccupancyReportQueryDto) {
    return this.reportsService.getOccupancy(query);
  }

  @Get('arrivals-departures')
  @Permissions('reports.arrivals_departures.read')
  @ApiOperation({
    summary: 'Get expected and completed arrivals and departures',
  })
  @ApiOkResponse({
    description: 'Arrival/departure counts and reservation references.',
  })
  arrivalsDepartures(@Query() query: ArrivalsDeparturesQueryDto) {
    return this.reportsService.getArrivalsDepartures(query);
  }

  @Get('room-status')
  @Permissions('reports.room_status.read')
  @ApiOperation({ summary: 'Get current room status counts and room list' })
  @ApiOkResponse({
    description: 'Current occupancy, cleaning, and maintenance combinations.',
  })
  roomStatus(@Query() query: RoomStatusReportQueryDto) {
    return this.reportsService.getRoomStatus(query);
  }

  @Get('revenue')
  @Permissions('reports.revenue.read')
  @ApiOperation({
    summary: 'Get consolidated revenue without POS room-charge duplication',
  })
  @ApiOkResponse({
    description: 'Decimal-safe revenue categories and grouped trend.',
  })
  revenue(@Query() query: RevenueReportQueryDto) {
    return this.reportsService.getRevenue(query);
  }

  @Get('payments')
  @Permissions('reports.payment_summary.read')
  @ApiOperation({ summary: 'Get folio and direct-POS payment totals' })
  @ApiOkResponse({ description: 'Non-voided payments by method and source.' })
  payments(@Query() query: PaymentSummaryQueryDto) {
    return this.reportsService.getPayments(query);
  }

  @Get('department-performance')
  @Permissions('reports.department_performance.read')
  @ApiOperation({ summary: 'Get raw operational KPIs by hotel department' })
  @ApiOkResponse({
    description: 'Cross-department KPIs without synthetic scoring.',
  })
  departmentPerformance(@Query() query: DepartmentPerformanceQueryDto) {
    return this.reportsService.getDepartmentPerformance(query);
  }

  @Get('housekeeping')
  @Permissions('reports.housekeeping.read')
  @ApiOperation({
    summary: 'Get housekeeping workload and productivity reporting',
  })
  @ApiOkResponse({
    description:
      'Task lifecycle, completion time, attendant productivity, and room readiness.',
  })
  housekeeping(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.getHousekeeping(query);
  }

  @Get('maintenance')
  @Permissions('reports.maintenance.read')
  @ApiOperation({
    summary: 'Get maintenance workload and performance reporting',
  })
  @ApiOkResponse({
    description:
      'Ticket lifecycle, technicians, issue types, and preventive exceptions.',
  })
  maintenance(@Query() query: ReportDateRangeQueryDto) {
    return this.reportsService.getMaintenance(query);
  }

  @Get('outlet-sales')
  @Permissions('reports.outlet_sales.read')
  @ApiOperation({ summary: 'Get outlet and POS sales reporting' })
  @ApiOkResponse({
    description: 'Order, outlet, payment-method, and top-item sales totals.',
  })
  outletSales(@Query() query: OutletSalesReportQueryDto) {
    return this.reportsService.getOutletSales(query);
  }

  @Get('inventory')
  @Permissions('reports.inventory.read')
  @ApiOperation({
    summary: 'Get current inventory value and period movement reporting',
  })
  @ApiOkResponse({
    description:
      'Current balances/value plus period movements; no historical snapshot inference.',
  })
  inventory(@Query() query: InventoryReportQueryDto) {
    return this.reportsService.getInventory(query);
  }

  @Get('procurement')
  @Permissions('reports.procurement.read')
  @ApiOperation({
    summary: 'Get purchase request, order, supplier, and GRN reporting',
  })
  @ApiOkResponse({
    description: 'Procurement statuses and ordered/received values.',
  })
  procurement(@Query() query: ProcurementReportQueryDto) {
    return this.reportsService.getProcurement(query);
  }
}
