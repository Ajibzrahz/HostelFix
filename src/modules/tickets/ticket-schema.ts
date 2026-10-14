import { z } from "zod";
import { CATEGORIES, PRIORITIES, STATUSES } from "./ticket-model";

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

export const listTicketsQuerySchema = z.strictObject({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(STATUSES).optional(),
  priority: z.enum(PRIORITIES).optional(),
  category: z.enum(CATEGORIES).optional(),
  room: objectId.optional(),
  sort: z.enum(["createdAt", "-createdAt"]).default("-createdAt"),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>;
