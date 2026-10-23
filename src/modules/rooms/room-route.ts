import { Router } from "express";
import validate from "../../middleware/validate";
import requireUser from "../../middleware/require-user";
import requireRole from "../../middleware/require-role";
import {
  roomIdSchema,
  listRoomsSchema,
  updateRoomSchema,
} from "./room-schema";
import {
  deleteRoomHandler,
  getRoomHandler,
  listRoomsHandler,
  updateRoomHandler,
} from "./room-controller";

const router = Router();

router.get("/", requireUser, validate(listRoomsSchema), listRoomsHandler);
router.get("/:roomId", requireUser, validate(roomIdSchema), getRoomHandler);
router.patch(
  "/:roomId",
  requireRole("admin", "staff"),
  validate(updateRoomSchema),
  updateRoomHandler,
);
router.delete(
  "/:roomId",
  requireRole("admin", "staff"),
  validate(roomIdSchema),
  deleteRoomHandler,
);

export default router;
