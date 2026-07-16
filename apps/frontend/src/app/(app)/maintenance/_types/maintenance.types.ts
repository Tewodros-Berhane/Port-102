export type TicketStatus =
  | "OPEN"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type IssueType =
  | "ELECTRICAL"
  | "PLUMBING"
  | "HVAC"
  | "FURNITURE"
  | "APPLIANCE"
  | "CLEANLINESS"
  | "STRUCTURAL"
  | "INTERNET_TV"
  | "SAFETY"
  | "OTHER";
export type User = {
  id: number;
  email: string;
  fullName: string;
  status: string;
};
export type Room = {
  id: number;
  roomNumber: string;
  displayName: string | null;
  maintenanceStatus: string;
  isActive: boolean;
};
export type AssetSummary = {
  id: number;
  assetNumber: string;
  name: string;
  category: string | null;
  location: string | null;
  roomId: number | null;
  status: string;
};
export type Ticket = {
  id: number;
  ticketNumber: string;
  roomId: number | null;
  assetId: number | null;
  source: string;
  sourceType: string | null;
  sourceId: number | null;
  issueType: IssueType;
  status: TicketStatus;
  priority: Priority;
  title: string;
  description: string | null;
  assignedToUserId: number | null;
  assignedAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  completionNotes: string | null;
  approvalNotes: string | null;
  cancellationReason: string | null;
  createdAt: string;
  room: Room | null;
  asset: AssetSummary | null;
  assignedTo: User | null;
  notes: Array<{
    id: number;
    note: string;
    createdAt: string;
    author: User | null;
  }>;
  photos: Array<{
    id: number;
    url: string;
    description: string | null;
    createdAt: string;
    uploadedBy: User | null;
  }>;
};
export type Asset = AssetSummary & {
  description: string | null;
  purchaseDate: string | null;
  warrantyUntil: string | null;
  createdAt: string;
  updatedAt: string;
  room: Room | null;
};
export type Plan = {
  id: number;
  planNumber: string;
  assetId: number | null;
  roomId: number | null;
  title: string;
  description: string | null;
  status: "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
  intervalDays: number;
  nextDueDate: string;
  lastCompletedAt: string | null;
  asset: AssetSummary | null;
  room: Room | null;
  createdBy: User;
};
export type Page<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
export type TicketQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  priority?: Priority;
  issueType?: IssueType;
  roomId?: number;
  assetId?: number;
  assignedToUserId?: number;
};
export type Dashboard = {
  openTickets: number;
  assignedTickets: number;
  inProgressTickets: number;
  completedPendingApproval: number;
  approvedToday: number;
  rejectedToday: number;
  urgentTickets: number;
  outOfOrderRooms: number;
  underMaintenanceRooms: number;
  assetsUnderMaintenance: number;
  overduePreventivePlans: number;
};
