import { z } from "zod";
import { CATEGORIES, PRIORITIES } from "./ticket-model";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Must be a valid ID");

export const createTicketSchema = z.strictObject({
  title: z.string().trim().min(3).max(100),
  description: z.string().trim().min(10).max(1000),
  category: z.enum(CATEGORIES),
  priority: z.enum(PRIORITIES).default("medium"),
  room: objectId,
  reportedBy: objectId, // TEMP: removed in Week 2, taken from the logged-in user
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
