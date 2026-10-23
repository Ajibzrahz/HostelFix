import { Router } from "express";
import validate from "../../middleware/validate";
import requireUser from "../../middleware/require-user";
import requireRole from "../../middleware/require-role";
import {
  createHostelSchema,
  hostelIdSchema,
  listHostelsSchema,
  updateHostelSchema,
} from "./hostel-schema";
import {
  createHostelHandler,
  deleteHostelHandler,
  getHostelHandler,
  listHostelsHandler,
  updateHostelHandler,
} from "./hostel-controller";
import {
  createRoomHandler,
  listHostelRoomsHandler,
} from "../rooms/room-controller";
import { createRoomSchema, listHostelRoomsSchema } from "../rooms/room-schema";

const router = Router();

router.get("/", requireUser, validate(listHostelsSchema), listHostelsHandler);
router.get(
  "/:hostelId",
  requireUser,
  validate(hostelIdSchema),
  getHostelHandler,
);
router.get(
  "/:hostelId/rooms",
  requireUser,
  validate(listHostelRoomsSchema),
  listHostelRoomsHandler,
);
router.post(
  "/",
  requireRole("admin"),
  validate(createHostelSchema),
  createHostelHandler,
);
router.patch(
  "/:hostelId",
  requireRole("admin"),
  validate(updateHostelSchema),
  updateHostelHandler,
);
router.delete(
  "/:hostelId",
  requireRole("admin"),
  validate(hostelIdSchema),
  deleteHostelHandler,
);

//create room
router.post(
  "/:hostelId/rooms",
  requireRole("admin", "staff"),
  validate(createRoomSchema),
  createRoomHandler,
);

export default router;
