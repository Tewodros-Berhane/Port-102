import { z } from "zod";
export const guestSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z.union([z.literal(""), z.email()]),
  phone: z.string(),
  nationality: z.string(),
  documentNumber: z.string(),
});
export type GuestFormValues = z.infer<typeof guestSchema>;
