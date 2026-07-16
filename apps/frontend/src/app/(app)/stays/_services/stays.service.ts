import { apiClient } from "@/lib/api-client";
import type {
  Folio,
  FolioSummary,
  Invoice,
  Payment,
  PaymentMethod,
  Receipt,
  Stay,
} from "../_types/stays.types";
export const getStay = (id: number) => apiClient.get<Stay>(`proxy/stays/${id}`);
export const extendStay = (
  id: number,
  p: { newExpectedCheckOutDate: string; reason?: string | null },
) => apiClient.patch<Stay>(`proxy/stays/${id}/extend`, p);
export const moveRoom = (
  id: number,
  p: { fromAssignmentId: number; toRoomId: number; reason?: string | null },
) => apiClient.post<Stay>(`proxy/stays/${id}/room-move`, p);
export const assignRoom = (
  id: number,
  p: {
    roomId: number;
    reservationRoomId?: number | null;
    reason?: string | null;
  },
) => apiClient.post<Stay>(`proxy/stays/${id}/rooms`, p);
export const checkoutStay = (
  id: number,
  p: { notes?: string | null; closeFolio?: boolean },
) => apiClient.post<Stay>(`proxy/stays/${id}/check-out`, p);
export const openFolio = (id: number) =>
  apiClient.post<Folio>(`proxy/stays/${id}/open-folio`);
export const getFolioByStay = (id: number) =>
  apiClient.get<Folio>(`proxy/folios/by-stay/${id}`);
export const getFolioSummary = (id: number) =>
  apiClient.get<FolioSummary>(`proxy/folios/${id}/summary`);
export const addCharge = (
  id: number,
  p: {
    type: string;
    description: string;
    quantity?: number;
    unitAmount: number;
  },
) => apiClient.post<FolioSummary>(`proxy/folios/${id}/line-items`, p);
export const applyDiscount = (
  id: number,
  p: {
    description: string;
    amount?: number;
    percent?: number;
    reason?: string | null;
  },
) =>
  apiClient.post<
    FolioSummary | { status: "APPROVAL_REQUIRED"; approvalRequest: unknown }
  >(`proxy/folios/${id}/discounts`, p);
export const recordPayment = (p: {
  folioId: number;
  amount: number;
  method: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  generateReceipt?: boolean;
}) =>
  apiClient.post<{ payment: Payment; folio: Folio; receipt: Receipt | null }>(
    "proxy/payments",
    p,
  );
export const getPayments = (folioId: number) =>
  apiClient.get<{ items: Payment[]; pagination: unknown }>(
    `proxy/payments/by-folio/${folioId}`,
  );
export const getInvoices = (folioId: number) =>
  apiClient.get<{ items: Invoice[]; pagination: unknown }>(
    `proxy/invoices/by-folio/${folioId}`,
  );
export const generateInvoice = (folioId: number) =>
  apiClient.post<Invoice>("proxy/invoices/generate", { folioId });
export const getReceipts = (folioId: number) =>
  apiClient.get<{ items: Receipt[]; pagination: unknown }>(
    `proxy/receipts/by-folio/${folioId}`,
  );
export const generateReceipt = (folioId: number, paymentId?: number) =>
  apiClient.post<Receipt>("proxy/receipts/generate", { folioId, paymentId });
