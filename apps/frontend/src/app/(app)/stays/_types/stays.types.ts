import type {
  GuestSummary,
  RoomSummary,
} from "../../front-desk/_types/front-desk.types";
export type StayAssignment = {
  id: number;
  stayId: number;
  roomId: number;
  reservationRoomId: number | null;
  status: "ACTIVE" | "RELEASED";
  assignedAt: string;
  releasedAt: string | null;
  reason: string | null;
  room: RoomSummary;
  reservationRoom: {
    id: number;
    roomTypeId: number;
    roomId: number | null;
    status: string;
  } | null;
};
export type Stay = {
  id: number;
  stayNumber: string;
  reservationId: number;
  guestId: number;
  status: "ACTIVE" | "CHECKED_OUT";
  checkedInAt: string;
  expectedCheckOutDate: string;
  checkedOutAt: string | null;
  notes: string | null;
  guest: GuestSummary;
  reservation: {
    id: number;
    reservationNumber: string;
    status: string;
    source: string;
    checkInDate: string;
    checkOutDate: string;
    adults: number;
    children: number;
  };
  roomAssignments: StayAssignment[];
};
export type Folio = {
  id: number;
  folioNumber: string;
  stayId: number;
  guestId: number;
  status: "OPEN" | "CLOSED" | "VOIDED";
  subtotalAmount: string;
  discountAmount: string;
  taxAmount: string;
  serviceAmount: string;
  totalAmount: string;
  paidAmount: string;
  balanceAmount: string;
  openedAt: string;
  closedAt: string | null;
};
export type FolioLine = {
  id: number;
  folioId: number;
  type: string;
  description: string;
  quantity: number;
  unitAmount: string;
  totalAmount: string;
  isVoided: boolean;
  voidReason: string | null;
  postedAt: string;
};
export type FolioSummary = {
  folio: Folio;
  lineItems: FolioLine[];
  totals: Pick<
    Folio,
    | "subtotalAmount"
    | "discountAmount"
    | "taxAmount"
    | "serviceAmount"
    | "totalAmount"
    | "paidAmount"
    | "balanceAmount"
  >;
};
export const paymentMethods = [
  "CASH",
  "CARD",
  "BANK_TRANSFER",
  "MOBILE_MONEY",
  "QR_PAYMENT",
  "OTHER",
] as const;
export type PaymentMethod = (typeof paymentMethods)[number];
export type Payment = {
  id: number;
  paymentNumber: string;
  folioId: number;
  amount: string;
  method: PaymentMethod;
  status: string;
  reference: string | null;
  notes: string | null;
  recordedAt: string;
};
export type Invoice = {
  id: number;
  invoiceNumber: string;
  folioId: number;
  status: string;
  totalAmount: string;
  issuedAt: string | null;
  createdAt: string;
};
export type Receipt = {
  id: number;
  receiptNumber: string;
  folioId: number;
  paymentId: number | null;
  status: string;
  amount: string;
  issuedAt: string;
  createdAt: string;
};
