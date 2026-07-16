export type ReportRange = {
  from: string;
  to: string;
  groupBy: "day" | "week" | "month";
  timezone: string;
};
export type RoomSummary = {
  total: number;
  occupied: number;
  vacant: number;
  dirty: number;
  inspected: number;
  outOfOrder: number;
  occupancyRate: number;
};
export type DashboardReport = {
  dateRange: ReportRange;
  rooms: RoomSummary;
  frontDesk: {
    arrivalsToday: number;
    departuresToday: number;
    inHouseGuests: number;
    activeStays: number;
  };
  financial: {
    roomRevenue: string;
    posRevenue: string;
    otherRevenue: string;
    totalRevenue: string;
    paymentsReceived: string;
    outstandingFolioBalance: string;
  };
  operations: {
    pendingHousekeepingTasks: number;
    openMaintenanceTickets: number;
    urgentMaintenanceTickets: number;
    lowStockItems: number;
    pendingPurchaseRequests: number;
  };
};
export type DailySummary = {
  dateRange: ReportRange;
  arrivals: number;
  departures: number;
  checkIns: number;
  checkouts: number;
  inHouseGuests: number;
  rooms: RoomSummary;
  reservationsCreated: number;
  cancellations: number;
  noShows: number;
  folioCharges: string;
  paymentsReceived: string;
  posSales: string;
  housekeepingTasksCompleted: number;
  maintenanceTicketsOpened: number;
  maintenanceTicketsCompleted: number;
};
export type ExceptionReport = {
  generatedAt: string;
  overdueThresholdHours: number;
  frontDesk: { overdueDepartures: unknown[]; unpaidOpenFolios: unknown[] };
  rooms: { outOfOrder: unknown[]; dirty: unknown[] };
  maintenance: { urgentTickets: unknown[] };
  housekeeping: { overdueTasks: unknown[] };
  inventory: { lowStockItems: unknown[]; zeroStockItems: unknown[] };
  procurement: {
    pendingPurchaseRequests: unknown[];
    overduePurchaseOrders: unknown[];
    oldDraftGoodsReceived: unknown[];
  };
};
export type DashboardFilters = { from?: string; to?: string };
