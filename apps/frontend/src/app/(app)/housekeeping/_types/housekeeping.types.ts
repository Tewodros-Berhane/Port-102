export type TaskStatus =
  | "PENDING"
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "INSPECTION_PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";
export type TaskType =
  | "CHECKOUT_CLEANING"
  | "STAYOVER_CLEANING"
  | "DEEP_CLEANING"
  | "INSPECTION"
  | "MANUAL";
export type Priority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type IssueStatus = "OPEN" | "RESOLVED" | "CANCELLED";
export type CleaningStatus = "CLEAN" | "DIRTY" | "INSPECTED";
export type UserSummary = {
  id: number;
  email: string;
  fullName: string;
  status: string;
};
export type Assignee = {
  id: number;
  fullName: string;
  email: string;
  employeeId: number | null;
  employeeNumber: string | null;
};
export type RoomSummary = {
  id: number;
  roomNumber: string;
  displayName: string | null;
  floorId: number;
  roomTypeId: number;
  occupancyStatus: string;
  cleaningStatus: CleaningStatus;
  maintenanceStatus: string;
  isActive: boolean;
};
export type Task = {
  id: number;
  taskNumber: string;
  roomId: number;
  type: TaskType;
  status: TaskStatus;
  priority: Priority;
  assignedToUserId: number | null;
  assignedByUserId: number | null;
  startedAt: string | null;
  completedAt: string | null;
  inspectedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  cancelledAt: string | null;
  completedByUserId: number | null;
  inspectedByUserId: number | null;
  approvedByUserId: number | null;
  rejectedByUserId: number | null;
  cancelledByUserId: number | null;
  notes: string | null;
  completionNotes: string | null;
  inspectionNotes: string | null;
  rejectionReason: string | null;
  cancellationReason: string | null;
  sourceType: string | null;
  sourceId: number | null;
  createdAt: string;
  updatedAt: string;
  room: RoomSummary;
  assignedTo: UserSummary | null;
  assignedBy: UserSummary | null;
  completedBy: UserSummary | null;
  inspectedBy: UserSummary | null;
  approvedBy: UserSummary | null;
  rejectedBy: UserSummary | null;
  cancelledBy: UserSummary | null;
};
export type Issue = {
  id: number;
  issueNumber: string;
  taskId: number | null;
  roomId: number;
  reportedByUserId: number | null;
  status: IssueStatus;
  title: string;
  description: string | null;
  photoUrl: string | null;
  resolvedAt: string | null;
  resolvedByUserId: number | null;
  resolutionNotes: string | null;
  createdAt: string;
  updatedAt: string;
  room: RoomSummary;
  task: Pick<
    Task,
    "id" | "taskNumber" | "roomId" | "type" | "status" | "priority"
  > | null;
  reportedBy: UserSummary | null;
  resolvedBy: UserSummary | null;
};
export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
export type ListResponse<T> = { items: T[]; pagination: Pagination };
export type TaskQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: TaskStatus;
  type?: TaskType;
  priority?: Priority;
  roomId?: number;
  assignedToUserId?: number;
  createdFrom?: string;
  createdTo?: string;
};
export type IssueQuery = {
  page?: number;
  limit?: number;
  search?: string;
  status?: IssueStatus;
  roomId?: number;
  taskId?: number;
  reportedByUserId?: number;
  createdFrom?: string;
  createdTo?: string;
};
export type Dashboard = {
  date: string;
  range: { from: string; to: string };
  pendingTasks: number;
  assignedTasks: number;
  inProgressTasks: number;
  inspectionPendingTasks: number;
  approvedTasksToday: number;
  rejectedTasksToday: number;
  openIssues: number;
  dirtyRooms: number;
  cleanRooms: number;
  inspectedRooms: number;
  roomsOutOfOrder: number;
  urgentTasks: number;
};
export type Productivity = {
  range: { from: string; to: string };
  items: Array<{
    attendant: UserSummary;
    assignedCount: number;
    completedCount: number;
    approvedCount: number;
    rejectedCount: number;
    averageCompletionMinutes: number | null;
  }>;
};
export type CreateTaskPayload = {
  roomId: number;
  type?: TaskType;
  priority?: Priority;
  assignedToUserId?: number;
  notes?: string | null;
};
export type CreateIssuePayload = {
  roomId: number;
  taskId?: number | null;
  title: string;
  description?: string | null;
};
