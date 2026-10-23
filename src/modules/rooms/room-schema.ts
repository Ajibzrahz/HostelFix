import * as z from "zod";
import { objectId } from "../../common/utils/objectId";

export const createRoomSchema = z.object({
  params: z.object({ hostelId: objectId }),
  body: z.strictObject({
    roomNumber: z
      .string({ error: "roomNumber is required" })
      .trim()
      .min(1)
      .max(20),
    floor: z.number().int().min(0).optional(),
  }),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>["body"];

export const updateRoomSchema = z.object({
  params: z.object({ roomId: objectId }),
  body: z
    .strictObject({
      roomNumber: z
        .string({ error: "name is required" })
        .trim()
        .min(1)
        .max(20)
        .optional(),
      floor: z.number().int().min(0).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "Provide at least one field to update",
    }),
});

export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;

export const roomIdSchema = z.object({
  params: z.object({ roomId: objectId }),
});

export const listRoomsSchema = z.object({
  query: z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
    hostel: objectId.optional(),
  }),
});
export type ListRoomsQuery = z.infer<typeof listRoomsSchema>["query"];

export const listHostelRoomsSchema = z.object({
  params: z.object({ hostelId: objectId }),
  query: z.strictObject({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(10),
  }),
});
