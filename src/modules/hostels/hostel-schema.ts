import * as z from "zod";
import { objectId } from "../../common/utils/objectId";

export const createHostelSchema = z.object({
  body: z.strictObject({
    name: z.string({ error: "name is required" }).trim().min(2).max(100),
    location: z.string().trim().max(200).optional(),
  }),
});

export type CreateHostelInput = z.infer<typeof createHostelSchema>["body"];

export const updateHostelSchema = z.object({
  params: z.object({ hostelId: objectId }),
  body: z
    .strictObject({
      name: z
        .string({ error: "name is required" })
        .trim()
        .min(2)
        .max(100)
        .optional(),
      location: z.string().trim().max(200).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export type UpdateHostelInput = z.infer<typeof updateHostelSchema>;

export const hostelIdSchema = z.object({
  params: z.object({ hostelId: objectId }),
});

export const listHostelsSchema = z.object({
  query: z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});
export type ListHostelsQuery = z.infer<typeof listHostelsSchema>["query"];
