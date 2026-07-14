import { BadRequestException, Injectable } from '@nestjs/common';

import {
  FolioLineItemType,
  HousekeepingTaskStatus,
  MaintenancePriority,
  MaintenanceTicketStatus,
  PaymentStatus,
  PosOrderPaymentStatus,
  PosOrderStatus,
  PosPaymentMethod,
  Prisma,
  PurchaseOrderStatus,
  PurchaseRequestStatus,
  ReservationStatus,
  RoomCleaningStatus,
  RoomMaintenanceStatus,
  RoomOccupancyStatus,
  StockMovementType,
} from '../../generated/prisma/client';
import {
  ArrivalsDeparturesQueryDto,
  DailySummaryQueryDto,
  DepartmentPerformanceQueryDto,
  ExecutiveDashboardQueryDto,
  GroupedReportQueryDto,
  InventoryReportQueryDto,
  OccupancyReportQueryDto,
  OperationsExceptionsQueryDto,
  OutletSalesReportQueryDto,
  PaymentSummaryQueryDto,
  ProcurementReportQueryDto,
  ReportDateRangeQueryDto,
  ReportGroupBy,
  RevenueReportQueryDto,
  RoomStatusReportQueryDto,
} from './dto/report-query.dto';
import { FinancialReportRepository } from './repositories/financial-report.repository';
import { OperationsReportRepository } from './repositories/operations-report.repository';
import { RoomReportRepository } from './repositories/room-report.repository';
import { SupplyChainReportRepository } from './repositories/supply-chain-report.repository';
import { PropertySettingsService } from '../property-settings/property-settings.service';

type DateRange = {
  from: Date;
  to: Date;
  groupBy: ReportGroupBy;
  timezone: string;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly roomReports: RoomReportRepository,
    private readonly financialReports: FinancialReportRepository,
    private readonly operationsReports: OperationsReportRepository,
    private readonly supplyReports: SupplyChainReportRepository,
    private readonly propertySettings: PropertySettingsService,
  ) {}

  async getDashboard(query: ExecutiveDashboardQueryDto) {
    const range = await this.parseRange(query, 0);
    const [
      rooms,
      arrivalsDepartures,
      activeStays,
      lineItems,
      folioPayments,
      posPayments,
      outstanding,
      pendingHousekeepingTasks,
      openMaintenanceTickets,
      urgentMaintenanceTickets,
      inventoryItems,
      pendingRequests,
    ] = await Promise.all([
      this.roomReports.listRooms(),
      this.roomReports.listReservationsForArrivalDeparture(
        range.from,
        range.to,
      ),
      this.roomReports.countActiveStays(),
      this.financialReports.listFolioLineItems(range.from, range.to),
      this.financialReports.listFolioPayments(range.from, range.to),
      this.financialReports.listPosPayments(range.from, range.to),
      this.financialReports.outstandingFolioBalance(),
      this.operationsReports.countPendingHousekeepingTasks(),
      this.operationsReports.countOpenMaintenanceTickets(),
      this.operationsReports.countUrgentMaintenanceTickets(),
      this.supplyReports.listInventoryItems(),
      this.supplyReports.listPendingPurchaseRequests(),
    ]);
    const roomCounts = this.roomCounts(rooms);
    const revenue = this.calculateRevenue(lineItems, posPayments);
    const payments = this.calculatePayments(folioPayments, posPayments);
    const lowStockItems = this.inventorySummary(inventoryItems).lowStockItems;

    return {
      dateRange: this.serializeRange(range),
      rooms: roomCounts,
      frontDesk: {
        arrivalsToday: arrivalsDepartures.filter((item) =>
          this.inRange(item.checkInDate, range),
        ).length,
        departuresToday: arrivalsDepartures.filter((item) =>
          this.inRange(item.checkOutDate, range),
        ).length,
        inHouseGuests: activeStays,
        activeStays,
      },
      financial: {
        roomRevenue: revenue.byCategory[FolioLineItemType.ROOM_CHARGE],
        posRevenue: revenue.outletRevenue,
        otherRevenue: revenue.otherRevenue,
        totalRevenue: revenue.netRevenue,
        paymentsReceived: payments.totalNonVoidedPayments,
        outstandingFolioBalance: this.money(outstanding._sum.balanceAmount),
      },
      operations: {
        pendingHousekeepingTasks,
        openMaintenanceTickets,
        urgentMaintenanceTickets,
        lowStockItems: lowStockItems.length,
        pendingPurchaseRequests: pendingRequests.length,
      },
    };
  }

  async getDailySummary(query: DailySummaryQueryDto) {
    const range = await this.parseRange(query, 0);
    const [
      rooms,
      reservations,
      stays,
      lineItems,
      folioPayments,
      posOrders,
      housekeeping,
      maintenance,
      reservationsCreated,
    ] = await Promise.all([
      this.roomReports.listRooms(),
      this.roomReports.listReservationsForArrivalDeparture(
        range.from,
        range.to,
      ),
      this.roomReports.listStaysOverlapping(range.from, range.to),
      this.financialReports.listFolioLineItems(range.from, range.to),
      this.financialReports.listFolioPayments(range.from, range.to),
      this.financialReports.listPosOrders(range.from, range.to),
      this.operationsReports.listHousekeepingTasks(range.from, range.to),
      this.operationsReports.listMaintenanceTickets(range.from, range.to),
      this.roomReports.countReservationsCreated(range.from, range.to),
    ]);
    const revenue = this.calculateRevenue(lineItems, []);
    const roomCounts = this.roomCounts(rooms);

    return {
      dateRange: this.serializeRange(range),
      arrivals: reservations.filter((item) =>
        this.inRange(item.checkInDate, range),
      ).length,
      departures: reservations.filter((item) =>
        this.inRange(item.checkOutDate, range),
      ).length,
      checkIns: stays.filter((item) => this.inRange(item.checkedInAt, range))
        .length,
      checkouts: stays.filter(
        (item) => item.checkedOutAt && this.inRange(item.checkedOutAt, range),
      ).length,
      inHouseGuests: stays.filter(
        (item) => !item.checkedOutAt || item.checkedOutAt > range.to,
      ).length,
      rooms: roomCounts,
      reservationsCreated,
      cancellations: reservations.filter(
        (item) => item.status === ReservationStatus.CANCELLED,
      ).length,
      noShows: reservations.filter(
        (item) => item.status === ReservationStatus.NO_SHOW,
      ).length,
      folioCharges: revenue.netRevenue,
      paymentsReceived: this.money(
        this.sum(
          folioPayments
            .filter((item) => item.status !== PaymentStatus.VOIDED)
            .map((item) => item.amount),
        ),
      ),
      posSales: this.money(
        this.sum(
          posOrders
            .filter((item) => item.status !== PosOrderStatus.CANCELLED)
            .map((item) => item.totalAmount),
        ),
      ),
      housekeepingTasksCompleted: housekeeping.filter(
        (item) => item.completedAt && this.inRange(item.completedAt, range),
      ).length,
      maintenanceTicketsOpened: maintenance.length,
      maintenanceTicketsCompleted: maintenance.filter(
        (item) => item.completedAt && this.inRange(item.completedAt, range),
      ).length,
    };
  }

  async getOccupancy(query: OccupancyReportQueryDto) {
    const range = await this.parseRange(query, 30);
    const [rooms, stays] = await Promise.all([
      this.roomReports.listRooms(
        query.roomTypeId ? { roomTypeId: query.roomTypeId } : {},
      ),
      this.roomReports.listStaysOverlapping(range.from, range.to),
    ]);
    const current = this.roomCounts(rooms);
    const roomTypeMap = new Map<
      number,
      {
        roomTypeId: number;
        code: string;
        name: string;
        total: number;
        occupied: number;
      }
    >();
    for (const room of rooms) {
      const row = roomTypeMap.get(room.roomType.id) ?? {
        roomTypeId: room.roomType.id,
        code: room.roomType.code,
        name: room.roomType.name,
        total: 0,
        occupied: 0,
      };
      row.total +=
        room.maintenanceStatus === RoomMaintenanceStatus.AVAILABLE ? 1 : 0;
      row.occupied +=
        room.occupancyStatus === RoomOccupancyStatus.OCCUPIED &&
        room.maintenanceStatus === RoomMaintenanceStatus.AVAILABLE
          ? 1
          : 0;
      roomTypeMap.set(room.roomType.id, row);
    }
    const byRoomType = [...roomTypeMap.values()].map((row) => ({
      ...row,
      occupancyRate: this.rate(row.occupied, row.total),
    }));
    const roomNightsSold = this.roomNightsSold(stays, range);

    return {
      dateRange: this.serializeRange(range),
      definition:
        'Current occupancy is occupied sellable rooms divided by total sellable rooms.',
      current: {
        totalSellableRooms: current.total - current.outOfOrder,
        occupiedRooms: current.occupied,
        availableRooms: current.vacant,
        outOfOrderRooms: current.outOfOrder,
        occupancyRate: current.occupancyRate,
      },
      roomNightsSold,
      byRoomType,
      timeSeries: this.groupStaysByPeriod(stays, range),
    };
  }

  async getArrivalsDepartures(query: ArrivalsDeparturesQueryDto) {
    const range = await this.parseRange(query, 7);
    const reservations =
      await this.roomReports.listReservationsForArrivalDeparture(
        range.from,
        range.to,
      );
    const arrivals = reservations.filter((item) =>
      this.inRange(item.checkInDate, range),
    );
    const departures = reservations.filter((item) =>
      this.inRange(item.checkOutDate, range),
    );
    return {
      dateRange: this.serializeRange(range),
      summary: {
        expectedArrivals: arrivals.filter(
          (item) => item.status === ReservationStatus.CONFIRMED,
        ).length,
        checkedInArrivals: arrivals.filter(
          (item) =>
            item.status === ReservationStatus.CHECKED_IN ||
            item.status === ReservationStatus.CHECKED_OUT,
        ).length,
        cancelledArrivals: arrivals.filter(
          (item) => item.status === ReservationStatus.CANCELLED,
        ).length,
        noShows: arrivals.filter(
          (item) => item.status === ReservationStatus.NO_SHOW,
        ).length,
        expectedDepartures: departures.filter(
          (item) => item.status === ReservationStatus.CHECKED_IN,
        ).length,
        checkedOutDepartures: departures.filter(
          (item) => item.status === ReservationStatus.CHECKED_OUT,
        ).length,
        overdueDepartures: reservations.filter(
          (item) =>
            item.stay?.status === 'ACTIVE' &&
            item.stay.expectedCheckOutDate < new Date(),
        ).length,
      },
      arrivals,
      departures,
    };
  }

  async getRoomStatus(query: RoomStatusReportQueryDto) {
    const rooms = await this.roomReports.listRooms(query);
    return {
      generatedAt: new Date().toISOString(),
      counts: this.roomStatusCounts(rooms),
      rooms,
    };
  }

  async getRevenue(query: RevenueReportQueryDto) {
    const range = await this.parseRange(query, 30);
    const [lineItems, posPayments] = await Promise.all([
      this.financialReports.listFolioLineItems(range.from, range.to),
      this.financialReports.listPosPayments(range.from, range.to),
    ]);
    return {
      dateRange: this.serializeRange(range),
      sourceRule:
        'Folio line items provide guest-account revenue; non-room-charge POS payments add direct outlet revenue.',
      ...this.calculateRevenue(lineItems, posPayments),
      timeSeries: this.groupMoneyRecords(
        [
          ...lineItems.map((item) => ({
            date: item.postedAt,
            amount:
              item.type === FolioLineItemType.DISCOUNT
                ? item.totalAmount.abs().negated()
                : item.totalAmount,
          })),
          ...posPayments
            .filter(
              (item) =>
                !item.isVoided &&
                item.method !== PosPaymentMethod.ROOM_CHARGE &&
                item.order.status !== PosOrderStatus.CANCELLED,
            )
            .map((item) => ({ date: item.recordedAt, amount: item.amount })),
        ],
        range,
      ),
    };
  }

  async getPayments(query: PaymentSummaryQueryDto) {
    const range = await this.parseRange(query, 30);
    const [folioPayments, posPayments, voided] = await Promise.all([
      this.financialReports.listFolioPayments(
        range.from,
        range.to,
        query.paymentMethod,
      ),
      this.financialReports.listPosPayments(range.from, range.to),
      this.financialReports.countVoidedPayments(range.from, range.to),
    ]);
    return {
      dateRange: this.serializeRange(range),
      ...this.calculatePayments(folioPayments, posPayments),
      voidedFolioPaymentAmount: this.money(voided._sum.amount),
      timeSeries: this.groupMoneyRecords(
        [
          ...folioPayments
            .filter((item) => item.status !== PaymentStatus.VOIDED)
            .map((item) => ({ date: item.recordedAt, amount: item.amount })),
          ...posPayments
            .filter(
              (item) =>
                !item.isVoided && item.method !== PosPaymentMethod.ROOM_CHARGE,
            )
            .map((item) => ({ date: item.recordedAt, amount: item.amount })),
        ],
        range,
      ),
    };
  }

  async getOutletSales(query: OutletSalesReportQueryDto) {
    const range = await this.parseRange(query, 30);
    const [orders, payments] = await Promise.all([
      this.financialReports.listPosOrders(range.from, range.to, query.outletId),
      this.financialReports.listPosPayments(range.from, range.to),
    ]);
    const valid = orders.filter(
      (item) => item.status !== PosOrderStatus.CANCELLED,
    );
    const byOutlet = new Map<
      number,
      {
        outletId: number;
        code: string;
        name: string;
        orders: number;
        sales: Prisma.Decimal;
      }
    >();
    const topItems = new Map<
      number,
      {
        menuItemId: number;
        code: string;
        name: string;
        quantity: number;
        sales: Prisma.Decimal;
      }
    >();
    for (const order of valid) {
      const outlet = byOutlet.get(order.outletId) ?? {
        outletId: order.outletId,
        ...order.outlet,
        orders: 0,
        sales: new Prisma.Decimal(0),
      };
      outlet.orders += 1;
      outlet.sales = outlet.sales.add(order.totalAmount);
      byOutlet.set(order.outletId, outlet);
      for (const item of order.items) {
        const row = topItems.get(item.menuItem.id) ?? {
          menuItemId: item.menuItem.id,
          ...item.menuItem,
          quantity: 0,
          sales: new Prisma.Decimal(0),
        };
        row.quantity += item.quantity;
        row.sales = row.sales.add(item.totalAmount);
        topItems.set(item.menuItem.id, row);
      }
    }
    const directPayments = payments.filter(
      (item) =>
        !item.isVoided &&
        item.method !== PosPaymentMethod.ROOM_CHARGE &&
        item.order.status !== PosOrderStatus.CANCELLED,
    );
    const roomChargeSales = valid.filter(
      (item) => item.paymentStatus === PosOrderPaymentStatus.CHARGED_TO_ROOM,
    );
    return {
      dateRange: this.serializeRange(range),
      totalOrders: orders.length,
      closedOrders: orders.filter(
        (item) => item.status === PosOrderStatus.CLOSED,
      ).length,
      cancelledOrders: orders.filter(
        (item) => item.status === PosOrderStatus.CANCELLED,
      ).length,
      grossSales: this.money(this.sum(valid.map((item) => item.totalAmount))),
      netSales: this.money(this.sum(valid.map((item) => item.totalAmount))),
      directPaymentSales: this.money(
        this.sum(directPayments.map((item) => item.amount)),
      ),
      roomChargeSales: this.money(
        this.sum(roomChargeSales.map((item) => item.totalAmount)),
      ),
      byOutlet: [...byOutlet.values()].map((item) => ({
        ...item,
        sales: this.money(item.sales),
      })),
      byPaymentMethod: this.groupPaymentsByMethod(directPayments),
      topSellingItems: [...topItems.values()]
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 20)
        .map((item) => ({ ...item, sales: this.money(item.sales) })),
    };
  }

  async getHousekeeping(query: ReportDateRangeQueryDto) {
    const range = await this.parseRange(query, 30);
    const [tasks, rooms] = await Promise.all([
      this.operationsReports.listHousekeepingTasks(range.from, range.to),
      this.roomReports.listRooms(),
    ]);
    const completed = tasks.filter((item) => item.completedAt);
    return {
      dateRange: this.serializeRange(range),
      tasksCreated: tasks.length,
      tasksCompleted: completed.length,
      tasksApproved: tasks.filter(
        (item) => item.status === HousekeepingTaskStatus.APPROVED,
      ).length,
      tasksRejected: tasks.filter(
        (item) => item.status === HousekeepingTaskStatus.REJECTED,
      ).length,
      pendingTasks: tasks.filter((item) =>
        (
          [
            HousekeepingTaskStatus.PENDING,
            HousekeepingTaskStatus.ASSIGNED,
            HousekeepingTaskStatus.IN_PROGRESS,
            HousekeepingTaskStatus.INSPECTION_PENDING,
          ] as HousekeepingTaskStatus[]
        ).includes(item.status),
      ).length,
      averageCompletionMinutes: this.averageMinutes(
        completed.map((item) => ({
          start: item.startedAt ?? item.createdAt,
          end: item.completedAt!,
        })),
      ),
      productivityByAttendant: this.productivity(tasks),
      rooms: {
        dirty: rooms.filter(
          (item) => item.cleaningStatus === RoomCleaningStatus.DIRTY,
        ).length,
        clean: rooms.filter(
          (item) => item.cleaningStatus === RoomCleaningStatus.CLEAN,
        ).length,
        inspected: rooms.filter(
          (item) => item.cleaningStatus === RoomCleaningStatus.INSPECTED,
        ).length,
      },
    };
  }

  async getMaintenance(query: ReportDateRangeQueryDto) {
    const range = await this.parseRange(query, 30);
    const [tickets, rooms, overduePreventivePlans] = await Promise.all([
      this.operationsReports.listMaintenanceTickets(range.from, range.to),
      this.roomReports.listRooms(),
      this.operationsReports.countOverduePreventivePlans(new Date()),
    ]);
    const completed = tickets.filter((item) => item.completedAt);
    return {
      dateRange: this.serializeRange(range),
      ticketsOpened: tickets.length,
      ticketsCompleted: completed.length,
      ticketsApproved: tickets.filter(
        (item) => item.status === MaintenanceTicketStatus.APPROVED,
      ).length,
      ticketsRejected: tickets.filter(
        (item) => item.status === MaintenanceTicketStatus.REJECTED,
      ).length,
      openTickets: tickets.filter(
        (item) =>
          !(
            [
              MaintenanceTicketStatus.APPROVED,
              MaintenanceTicketStatus.CANCELLED,
            ] as MaintenanceTicketStatus[]
          ).includes(item.status),
      ).length,
      urgentTickets: tickets.filter(
        (item) =>
          item.priority === MaintenancePriority.URGENT &&
          !(
            [
              MaintenanceTicketStatus.APPROVED,
              MaintenanceTicketStatus.CANCELLED,
            ] as MaintenanceTicketStatus[]
          ).includes(item.status),
      ).length,
      averageCompletionMinutes: this.averageMinutes(
        completed.map((item) => ({
          start: item.startedAt ?? item.createdAt,
          end: item.completedAt!,
        })),
      ),
      ticketsByIssueType: this.countBy(tickets, (item) => item.issueType),
      ticketsByTechnician: this.technicianPerformance(tickets),
      outOfOrderRooms: rooms.filter(
        (item) => item.maintenanceStatus === RoomMaintenanceStatus.OUT_OF_ORDER,
      ).length,
      overduePreventivePlans,
    };
  }

  async getInventory(query: InventoryReportQueryDto) {
    const range = await this.parseRange(query, 30);
    const [items, movements] = await Promise.all([
      this.supplyReports.listInventoryItems(query.locationId),
      this.supplyReports.listMovements(range.from, range.to, query.locationId),
    ]);
    return {
      dateRange: this.serializeRange(range),
      ...this.inventorySummary(items),
      movements: this.movementSummary(movements),
    };
  }

  async getProcurement(query: ProcurementReportQueryDto) {
    const range = await this.parseRange(query, 30);
    const [requests, orders, goodsReceived, activeSuppliers] =
      await Promise.all([
        this.supplyReports.listPurchaseRequests(range.from, range.to),
        this.supplyReports.listPurchaseOrders(range.from, range.to),
        this.supplyReports.listGoodsReceived(range.from, range.to),
        this.supplyReports.countActiveSuppliers(),
      ]);
    const openOrderStatuses: PurchaseOrderStatus[] = [
      PurchaseOrderStatus.DRAFT,
      PurchaseOrderStatus.SUBMITTED,
      PurchaseOrderStatus.APPROVED,
      PurchaseOrderStatus.ORDERED,
    ];
    return {
      dateRange: this.serializeRange(range),
      pendingPurchaseRequests: requests.filter(
        (item) => item.status === PurchaseRequestStatus.SUBMITTED,
      ).length,
      approvedPurchaseRequests: requests.filter(
        (item) => item.status === PurchaseRequestStatus.APPROVED,
      ).length,
      rejectedPurchaseRequests: requests.filter(
        (item) => item.status === PurchaseRequestStatus.REJECTED,
      ).length,
      openPurchaseOrders: orders.filter((item) =>
        openOrderStatuses.includes(item.status),
      ).length,
      partiallyReceivedOrders: orders.filter(
        (item) => item.status === PurchaseOrderStatus.PARTIALLY_RECEIVED,
      ).length,
      receivedOrders: orders.filter(
        (item) => item.status === PurchaseOrderStatus.RECEIVED,
      ).length,
      totalOrderedValue: this.money(
        this.sum(
          orders.flatMap((order) =>
            order.items.map((item) =>
              item.unitCost
                ? item.quantity.mul(item.unitCost)
                : new Prisma.Decimal(0),
            ),
          ),
        ),
      ),
      totalReceivedValue: this.money(
        this.sum(
          goodsReceived
            .filter((item) => item.status === 'POSTED')
            .flatMap((grn) =>
              grn.items.map((item) =>
                item.unitCost
                  ? item.quantity.mul(item.unitCost)
                  : new Prisma.Decimal(0),
              ),
            ),
        ),
      ),
      activeSuppliers,
      overdueExpectedPurchaseOrders: orders.filter(
        (item) =>
          item.expectedAt &&
          item.expectedAt < new Date() &&
          (
            [
              PurchaseOrderStatus.ORDERED,
              PurchaseOrderStatus.PARTIALLY_RECEIVED,
            ] as PurchaseOrderStatus[]
          ).includes(item.status),
      ).length,
    };
  }

  async getDepartmentPerformance(query: DepartmentPerformanceQueryDto) {
    const range = await this.parseRange(query, 30);
    const nestedQuery = {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      groupBy: range.groupBy,
    };
    const [
      arrivals,
      housekeeping,
      maintenance,
      outletSales,
      inventory,
      procurement,
    ] = await Promise.all([
      this.getArrivalsDepartures(nestedQuery),
      this.getHousekeeping(nestedQuery),
      this.getMaintenance(nestedQuery),
      this.getOutletSales(nestedQuery),
      this.getInventory(nestedQuery),
      this.getProcurement(nestedQuery),
    ]);
    return {
      dateRange: this.serializeRange(range),
      departmentId: query.departmentId ?? null,
      frontDesk: arrivals.summary,
      housekeeping: {
        tasksCompleted: housekeeping.tasksCompleted,
        tasksApproved: housekeeping.tasksApproved,
        pendingTasks: housekeeping.pendingTasks,
        averageCompletionMinutes: housekeeping.averageCompletionMinutes,
      },
      maintenance: {
        ticketsCompleted: maintenance.ticketsCompleted,
        openTickets: maintenance.openTickets,
        urgentTickets: maintenance.urgentTickets,
        averageCompletionMinutes: maintenance.averageCompletionMinutes,
      },
      restaurant: {
        netSales: outletSales.netSales,
        totalOrders: outletSales.totalOrders,
        cancelledOrders: outletSales.cancelledOrders,
      },
      inventory: {
        lowStockItems: inventory.lowStockItems.length,
        zeroStockItems: inventory.zeroStockItems.length,
        movementVolume: inventory.movements.totalMovements,
      },
      procurement: {
        pendingPurchaseRequests: procurement.pendingPurchaseRequests,
        openPurchaseOrders: procurement.openPurchaseOrders,
        partiallyReceivedOrders: procurement.partiallyReceivedOrders,
      },
    };
  }

  async getExceptions(query: OperationsExceptionsQueryDto) {
    const now = new Date();
    const cutoff = new Date(
      now.getTime() - (query.overdueHours ?? 24) * 3_600_000,
    );
    const [
      overdueDepartures,
      unpaidFolios,
      rooms,
      urgentMaintenance,
      overdueHousekeeping,
      items,
      pendingRequests,
      overdueOrders,
      oldGrns,
    ] = await Promise.all([
      this.roomReports.listOverdueStays(now),
      this.financialReports.listUnpaidOpenFolios(),
      this.roomReports.listRooms(),
      this.operationsReports.listUrgentMaintenanceTickets(),
      this.operationsReports.listOverdueHousekeepingTasks(cutoff),
      this.supplyReports.listInventoryItems(),
      this.supplyReports.listPendingPurchaseRequests(),
      this.supplyReports.listOverduePurchaseOrders(now),
      this.supplyReports.listDraftGoodsReceivedBefore(cutoff),
    ]);
    const inventory = this.inventorySummary(items);
    return {
      generatedAt: now.toISOString(),
      overdueThresholdHours: query.overdueHours ?? 24,
      frontDesk: { overdueDepartures, unpaidOpenFolios: unpaidFolios },
      rooms: {
        outOfOrder: rooms.filter(
          (item) => item.maintenanceStatus !== RoomMaintenanceStatus.AVAILABLE,
        ),
        dirty: rooms.filter(
          (item) => item.cleaningStatus === RoomCleaningStatus.DIRTY,
        ),
      },
      maintenance: { urgentTickets: urgentMaintenance },
      housekeeping: { overdueTasks: overdueHousekeeping },
      inventory: {
        lowStockItems: inventory.lowStockItems,
        zeroStockItems: inventory.zeroStockItems,
      },
      procurement: {
        pendingPurchaseRequests: pendingRequests,
        overduePurchaseOrders: overdueOrders,
        oldDraftGoodsReceived: oldGrns,
      },
    };
  }

  private async parseRange(
    query: ReportDateRangeQueryDto | GroupedReportQueryDto,
    defaultDays: number,
  ): Promise<DateRange> {
    const propertyRange = await this.propertySettings.toPropertyDateRange(
      query.from,
      query.to,
      defaultDays,
    );
    const { from, to, timezone } = propertyRange;
    if (to < from)
      throw new BadRequestException(
        'Report date range `to` must be on or after `from`.',
      );
    if (to.getTime() - from.getTime() > 366 * 86_400_000)
      throw new BadRequestException(
        'Report date range cannot exceed 366 days.',
      );
    return {
      from,
      to,
      groupBy:
        'groupBy' in query && query.groupBy ? query.groupBy : ReportGroupBy.DAY,
      timezone,
    };
  }

  private startBoundary(value: string) {
    const date = new Date(value);
    return value.length === 10 ? this.startOfUtcDay(date) : date;
  }
  private endBoundary(value: string) {
    const date = new Date(value);
    return value.length === 10 ? this.endOfUtcDay(date) : date;
  }
  private startOfUtcDay(date: Date) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }
  private endOfUtcDay(date: Date) {
    return new Date(
      Date.UTC(
        date.getUTCFullYear(),
        date.getUTCMonth(),
        date.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
  }
  private serializeRange(range: DateRange) {
    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      groupBy: range.groupBy,
      timezone: range.timezone,
    };
  }
  private inRange(date: Date, range: DateRange) {
    return date >= range.from && date <= range.to;
  }
  private money(value: Prisma.Decimal | number | string | null | undefined) {
    return new Prisma.Decimal(value ?? 0).toDecimalPlaces(2).toFixed(2);
  }
  private sum(values: Prisma.Decimal[]) {
    return values.reduce((sum, value) => sum.add(value), new Prisma.Decimal(0));
  }
  private rate(value: number, total: number) {
    return total === 0 ? 0 : Number(((value / total) * 100).toFixed(2));
  }

  private roomCounts(
    rooms: Awaited<ReturnType<RoomReportRepository['listRooms']>>,
  ) {
    const occupied = rooms.filter(
      (item) => item.occupancyStatus === RoomOccupancyStatus.OCCUPIED,
    ).length;
    const outOfOrder = rooms.filter(
      (item) => item.maintenanceStatus !== RoomMaintenanceStatus.AVAILABLE,
    ).length;
    const sellable = rooms.length - outOfOrder;
    return {
      total: rooms.length,
      occupied,
      vacant: rooms.filter(
        (item) => item.occupancyStatus === RoomOccupancyStatus.VACANT,
      ).length,
      dirty: rooms.filter(
        (item) => item.cleaningStatus === RoomCleaningStatus.DIRTY,
      ).length,
      inspected: rooms.filter(
        (item) => item.cleaningStatus === RoomCleaningStatus.INSPECTED,
      ).length,
      outOfOrder,
      occupancyRate: this.rate(
        rooms.filter(
          (item) =>
            item.occupancyStatus === RoomOccupancyStatus.OCCUPIED &&
            item.maintenanceStatus === RoomMaintenanceStatus.AVAILABLE,
        ).length,
        sellable,
      ),
    };
  }

  private roomStatusCounts(
    rooms: Awaited<ReturnType<RoomReportRepository['listRooms']>>,
  ) {
    return {
      occupancy: this.countBy(rooms, (item) => item.occupancyStatus),
      cleaning: this.countBy(rooms, (item) => item.cleaningStatus),
      maintenance: this.countBy(rooms, (item) => item.maintenanceStatus),
    };
  }

  private calculateRevenue(
    lineItems: Awaited<
      ReturnType<FinancialReportRepository['listFolioLineItems']>
    >,
    posPayments: Awaited<
      ReturnType<FinancialReportRepository['listPosPayments']>
    >,
  ) {
    const categories = Object.values(FolioLineItemType).reduce<
      Record<string, Prisma.Decimal>
    >((result, type) => ({ ...result, [type]: new Prisma.Decimal(0) }), {});
    for (const item of lineItems)
      categories[item.type] = categories[item.type].add(item.totalAmount);
    const discounts = categories[FolioLineItemType.DISCOUNT].abs();
    const grossCharges = this.sum(
      lineItems
        .filter((item) => item.type !== FolioLineItemType.DISCOUNT)
        .map((item) => item.totalAmount),
    );
    const directPos = this.sum(
      posPayments
        .filter(
          (item) =>
            !item.isVoided &&
            item.method !== PosPaymentMethod.ROOM_CHARGE &&
            item.order.status !== PosOrderStatus.CANCELLED,
        )
        .map((item) => item.amount),
    );
    const folioNet = grossCharges.sub(discounts);
    const outletRevenue =
      categories[FolioLineItemType.POS_CHARGE].add(directPos);
    const roomRevenue = categories[FolioLineItemType.ROOM_CHARGE];
    const otherRevenue = folioNet
      .sub(roomRevenue)
      .sub(categories[FolioLineItemType.POS_CHARGE]);
    return {
      grossCharges: this.money(grossCharges.add(directPos)),
      discounts: this.money(discounts),
      taxes: this.money(categories[FolioLineItemType.TAX]),
      serviceCharges: this.money(categories[FolioLineItemType.SERVICE_CHARGE]),
      netRevenue: this.money(folioNet.add(directPos)),
      roomRevenue: this.money(roomRevenue),
      outletRevenue: this.money(outletRevenue),
      otherRevenue: this.money(otherRevenue),
      byCategory: Object.fromEntries(
        Object.entries(categories).map(([key, value]) => [
          key,
          this.money(value),
        ]),
      ),
    };
  }

  private calculatePayments(
    folioPayments: Awaited<
      ReturnType<FinancialReportRepository['listFolioPayments']>
    >,
    posPayments: Awaited<
      ReturnType<FinancialReportRepository['listPosPayments']>
    >,
  ) {
    const validFolio = folioPayments.filter(
      (item) => item.status !== PaymentStatus.VOIDED,
    );
    const validPos = posPayments.filter(
      (item) =>
        !item.isVoided &&
        item.method !== PosPaymentMethod.ROOM_CHARGE &&
        item.order.status !== PosOrderStatus.CANCELLED,
    );
    const byMethod: Record<string, Prisma.Decimal> = {};
    for (const payment of validFolio)
      byMethod[payment.method] = (
        byMethod[payment.method] ?? new Prisma.Decimal(0)
      ).add(payment.amount);
    for (const payment of validPos)
      byMethod[payment.method] = (
        byMethod[payment.method] ?? new Prisma.Decimal(0)
      ).add(payment.amount);
    return {
      folioPayments: this.money(
        this.sum(validFolio.map((item) => item.amount)),
      ),
      directPosPayments: this.money(
        this.sum(validPos.map((item) => item.amount)),
      ),
      totalNonVoidedPayments: this.money(this.sum(Object.values(byMethod))),
      byMethod: Object.fromEntries(
        Object.entries(byMethod).map(([key, value]) => [
          key,
          this.money(value),
        ]),
      ),
    };
  }

  private inventorySummary(
    items: Awaited<
      ReturnType<SupplyChainReportRepository['listInventoryItems']>
    >,
  ) {
    const rows = items.map((item) => {
      const quantity = this.sum(
        item.balances.map((balance) => balance.quantity),
      );
      return {
        ...item,
        quantity,
        value: item.averageCost
          ? quantity.mul(item.averageCost)
          : new Prisma.Decimal(0),
      };
    });
    const lowStockItems = rows
      .filter(
        (item) => item.reorderLevel && item.quantity.lte(item.reorderLevel),
      )
      .map((item) => ({
        itemId: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
        quantity: this.money(item.quantity),
        reorderLevel: this.money(item.reorderLevel),
      }));
    const zeroStockItems = rows
      .filter((item) => item.quantity.equals(0))
      .map((item) => ({
        itemId: item.id,
        itemNumber: item.itemNumber,
        name: item.name,
      }));
    const byType = new Map<
      string,
      { items: number; quantity: Prisma.Decimal; value: Prisma.Decimal }
    >();
    const byLocation = new Map<
      number,
      {
        locationId: number;
        code: string;
        name: string;
        quantity: Prisma.Decimal;
        value: Prisma.Decimal;
      }
    >();
    for (const item of rows) {
      const type = byType.get(item.type) ?? {
        items: 0,
        quantity: new Prisma.Decimal(0),
        value: new Prisma.Decimal(0),
      };
      type.items += 1;
      type.quantity = type.quantity.add(item.quantity);
      type.value = type.value.add(item.value);
      byType.set(item.type, type);
      for (const balance of item.balances) {
        const row = byLocation.get(balance.location.id) ?? {
          locationId: balance.location.id,
          code: balance.location.code,
          name: balance.location.name,
          quantity: new Prisma.Decimal(0),
          value: new Prisma.Decimal(0),
        };
        row.quantity = row.quantity.add(balance.quantity);
        row.value = row.value.add(
          item.averageCost ? balance.quantity.mul(item.averageCost) : 0,
        );
        byLocation.set(balance.location.id, row);
      }
    }
    return {
      activeInventoryItems: items.length,
      totalStockValue: this.money(this.sum(rows.map((item) => item.value))),
      lowStockItems,
      zeroStockItems,
      stockByItemType: Object.fromEntries(
        [...byType].map(([key, value]) => [
          key,
          {
            items: value.items,
            quantity: this.money(value.quantity),
            value: this.money(value.value),
          },
        ]),
      ),
      stockByLocation: [...byLocation.values()].map((item) => ({
        ...item,
        quantity: this.money(item.quantity),
        value: this.money(item.value),
      })),
    };
  }

  private movementSummary(
    movements: Awaited<
      ReturnType<SupplyChainReportRepository['listMovements']>
    >,
  ) {
    const totals = this.countBy(movements, (item) => item.type);
    const consumed = new Map<number, Prisma.Decimal>();
    for (const movement of movements.filter((item) =>
      (
        [
          StockMovementType.ISSUE,
          StockMovementType.WASTE,
          StockMovementType.POS_CONSUMPTION,
        ] as StockMovementType[]
      ).includes(item.type),
    ))
      consumed.set(
        movement.itemId,
        (consumed.get(movement.itemId) ?? new Prisma.Decimal(0)).add(
          movement.quantity,
        ),
      );
    return {
      totalMovements: movements.length,
      receipts: totals[StockMovementType.RECEIPT] ?? 0,
      issues: totals[StockMovementType.ISSUE] ?? 0,
      transfers:
        (totals[StockMovementType.TRANSFER_OUT] ?? 0) +
        (totals[StockMovementType.TRANSFER_IN] ?? 0),
      adjustments:
        (totals[StockMovementType.ADJUSTMENT_IN] ?? 0) +
        (totals[StockMovementType.ADJUSTMENT_OUT] ?? 0),
      waste: totals[StockMovementType.WASTE] ?? 0,
      topConsumedItems: [...consumed]
        .sort((a, b) => b[1].cmp(a[1]))
        .slice(0, 20)
        .map(([itemId, quantity]) => ({
          itemId,
          quantity: this.money(quantity),
        })),
    };
  }

  private groupMoneyRecords(
    records: { date: Date; amount: Prisma.Decimal }[],
    range: DateRange,
  ) {
    const groups = new Map<string, Prisma.Decimal>();
    for (const record of records) {
      const key = this.groupKey(record.date, range.groupBy);
      groups.set(
        key,
        (groups.get(key) ?? new Prisma.Decimal(0)).add(record.amount),
      );
    }
    return [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, amount]) => ({ period, amount: this.money(amount) }));
  }
  private groupStaysByPeriod(
    stays: Awaited<ReturnType<RoomReportRepository['listStaysOverlapping']>>,
    range: DateRange,
  ) {
    const groups = new Map<string, Set<number>>();
    for (const stay of stays) {
      const key = this.groupKey(
        stay.checkedInAt < range.from ? range.from : stay.checkedInAt,
        range.groupBy,
      );
      const ids = groups.get(key) ?? new Set<number>();
      for (const assignment of stay.roomAssignments) ids.add(assignment.roomId);
      groups.set(key, ids);
    }
    return [...groups]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, rooms]) => ({ period, occupiedRooms: rooms.size }));
  }
  private groupKey(date: Date, groupBy: ReportGroupBy) {
    if (groupBy === ReportGroupBy.MONTH) return date.toISOString().slice(0, 7);
    if (groupBy === ReportGroupBy.WEEK) {
      const copy = this.startOfUtcDay(date);
      copy.setUTCDate(copy.getUTCDate() - ((copy.getUTCDay() + 6) % 7));
      return copy.toISOString().slice(0, 10);
    }
    return date.toISOString().slice(0, 10);
  }
  private roomNightsSold(
    stays: Awaited<ReturnType<RoomReportRepository['listStaysOverlapping']>>,
    range: DateRange,
  ) {
    let nights = 0;
    for (const stay of stays)
      for (const assignment of stay.roomAssignments) {
        const start = new Date(
          Math.max(range.from.getTime(), assignment.assignedAt.getTime()),
        );
        const end = new Date(
          Math.min(
            range.to.getTime(),
            (assignment.releasedAt ?? stay.checkedOutAt ?? range.to).getTime(),
          ),
        );
        nights += Math.max(
          0,
          Math.ceil((end.getTime() - start.getTime()) / 86_400_000),
        );
      }
    return nights;
  }
  private averageMinutes(periods: { start: Date; end: Date }[]) {
    return periods.length === 0
      ? 0
      : Number(
          (
            periods.reduce(
              (sum, item) =>
                sum + (item.end.getTime() - item.start.getTime()) / 60_000,
              0,
            ) / periods.length
          ).toFixed(2),
        );
  }
  private countBy<T>(items: T[], key: (item: T) => string) {
    return items.reduce<Record<string, number>>((result, item) => {
      const value = key(item);
      result[value] = (result[value] ?? 0) + 1;
      return result;
    }, {});
  }
  private productivity(
    tasks: Awaited<
      ReturnType<OperationsReportRepository['listHousekeepingTasks']>
    >,
  ) {
    const rows = new Map<
      number,
      {
        userId: number;
        name: string;
        assigned: number;
        completed: number;
        approved: number;
      }
    >();
    for (const task of tasks)
      if (task.assignedToUserId) {
        const row = rows.get(task.assignedToUserId) ?? {
          userId: task.assignedToUserId,
          name: task.assignedTo?.fullName ?? 'Unknown',
          assigned: 0,
          completed: 0,
          approved: 0,
        };
        row.assigned += 1;
        row.completed += task.completedAt ? 1 : 0;
        row.approved += task.status === HousekeepingTaskStatus.APPROVED ? 1 : 0;
        rows.set(row.userId, row);
      }
    return [...rows.values()].map((row) => ({
      ...row,
      completionRate: this.rate(row.completed, row.assigned),
      approvalRate: this.rate(row.approved, row.completed),
    }));
  }
  private technicianPerformance(
    tickets: Awaited<
      ReturnType<OperationsReportRepository['listMaintenanceTickets']>
    >,
  ) {
    const rows = new Map<
      number,
      { userId: number; name: string; assigned: number; completed: number }
    >();
    for (const ticket of tickets)
      if (ticket.assignedToUserId) {
        const row = rows.get(ticket.assignedToUserId) ?? {
          userId: ticket.assignedToUserId,
          name: ticket.assignedTo?.fullName ?? 'Unknown',
          assigned: 0,
          completed: 0,
        };
        row.assigned += 1;
        row.completed += ticket.completedAt ? 1 : 0;
        rows.set(row.userId, row);
      }
    return [...rows.values()].map((row) => ({
      ...row,
      completionRate: this.rate(row.completed, row.assigned),
    }));
  }
  private groupPaymentsByMethod(
    payments: Awaited<ReturnType<FinancialReportRepository['listPosPayments']>>,
  ) {
    const values: Record<string, Prisma.Decimal> = {};
    for (const payment of payments)
      values[payment.method] = (
        values[payment.method] ?? new Prisma.Decimal(0)
      ).add(payment.amount);
    return Object.fromEntries(
      Object.entries(values).map(([key, value]) => [key, this.money(value)]),
    );
  }
}
