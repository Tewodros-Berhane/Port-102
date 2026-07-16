export type ReportFilters = {
  from?: string;
  to?: string;
  groupBy?: "day" | "week" | "month";
};
export type ReportPayload = Record<string, unknown>;
