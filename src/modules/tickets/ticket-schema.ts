import { z } from "zod";
import { CATEGORIES, PRIORITIES, STATUSES } from "./ticket-model";
import { objectId } from "../../common/utils/objectId";

export const createTicketSchema = z.object({
  body: z.strictObject({
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(1000),
    category: z.enum(CATEGORIES),
    priority: z.enum(PRIORITIES).default("medium"),
    room: objectId,
  }),
});

export type CreateTicketInput = z.infer<typeof createTicketSchema>["body"];

export const listTicketsQuerySchema = z.object({
  query: z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    status: z.enum(STATUSES).optional(),
    priority: z.enum(PRIORITIES).optional(),
    category: z.enum(CATEGORIES).optional(),
    room: objectId.optional(),
    sort: z.enum(["createdAt", "-createdAt"]).default("-createdAt"),
  }),
});

export type ListTicketsQuery = z.infer<typeof listTicketsQuerySchema>["query"];

export const updateTicketSchema = z.object({
  params: z.object({ id: objectId }),
  body: z
    .strictObject({
      title: z.string().trim().min(3).max(100).optional(),
      description: z.string().trim().min(10).max(1000).optional(),
      category: z.enum(CATEGORIES).optional(),
      priority: z.enum(PRIORITIES).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;

export const ticketIdSchema = z.object({
  params: z.object({ id: objectId }),
});

export const ticketCommentSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.strictObject({
    body: z.string({ error: "body is required" }).trim().min(1).max(500),
  }),
});
export type TicketCommentInput = z.infer<typeof ticketCommentSchema>["body"];

export const assignTicketSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.strictObject({ assignedTo: objectId }),
});
export type AssignTicketInput = z.infer<typeof assignTicketSchema>["body"];

export const updateStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.strictObject({
    status: z.enum(STATUSES, { error: "A valid status is required" }),
  }),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>["body"];