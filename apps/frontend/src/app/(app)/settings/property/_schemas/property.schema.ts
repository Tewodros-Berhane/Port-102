import { z } from "zod";
const optionalText = z.string().optional();
const optionalUrl = z.union([z.literal(""), z.url()]).optional();
const rate = z.number().min(0).max(100).optional();
export const propertySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  code: z.string().max(30).optional(),
  legalName: optionalText,
  taxIdentification: optionalText,
  registrationNumber: optionalText,
  email: z.union([z.literal(""), z.email()]).optional(),
  phone: optionalText,
  alternatePhone: optionalText,
  website: optionalUrl,
  addressLine1: optionalText,
  addressLine2: optionalText,
  city: optionalText,
  region: optionalText,
  country: optionalText,
  timezone: z.string().min(1).optional(),
  defaultCurrency: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .optional(),
  locale: z
    .string()
    .regex(/^[a-z]{2,3}(?:-[A-Z]{2})?$/)
    .optional(),
  checkInTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  checkOutTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
    .optional(),
  logoUrl: optionalUrl,
  receiptFooter: optionalText,
  invoiceFooter: optionalText,
  defaultTaxRate: rate,
  defaultServiceChargeRate: rate,
});
export type PropertyForm = z.infer<typeof propertySchema>;
