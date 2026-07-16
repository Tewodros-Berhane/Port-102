import { z } from "zod";
import { reservationSources } from "../_types/reservations.types";
export const createReservationSchema = z
  .object({
    guestId: z.coerce.number().int().min(1),
    checkInDate: z.string().date(),
    checkOutDate: z.string().date(),
    adults: z.coerce.number().int().min(1),
    children: z.coerce.number().int().min(0),
    source: z.enum(reservationSources),
    roomTypeId: z.coerce.number().int().min(1),
    roomId: z.union([z.literal(""), z.coerce.number().int().min(1)]),
    specialRequests: z.string(),
    internalNotes: z.string(),
  })
  .refine((v) => Date.parse(v.checkOutDate) > Date.parse(v.checkInDate), {
    path: ["checkOutDate"],
    message: "Checkout must be after check-in",
  });
export type CreateReservationValues = z.infer<typeof createReservationSchema>;
