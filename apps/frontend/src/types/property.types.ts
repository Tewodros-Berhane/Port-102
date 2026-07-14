export type PropertySettings = {
  id: number; name: string; code: string | null; legalName: string | null;
  taxIdentification: string | null; registrationNumber: string | null;
  email: string | null; phone: string | null; alternatePhone: string | null;
  website: string | null; address: string | null; addressLine1: string | null;
  addressLine2: string | null; city: string | null; region: string | null;
  country: string; timezone: string;
  defaultCurrency: string; locale: string; defaultTaxRate: string | null;
  defaultServiceChargeRate: string | null; checkInTime: string | null;
  checkOutTime: string | null; logoUrl: string | null; receiptFooter: string | null;
  invoiceFooter: string | null; createdAt: string; updatedAt: string;
};
