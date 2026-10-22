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
  getHostelHandler,
  listHostelsHandler,
  updateHostelHandler,
} from "./hostel-controller";

const router = Router();

router.get("/", requireUser, validate(listHostelsSchema), listHostelsHandler);
router.get(
  "/:hostelId",
  requireUser,
  validate(hostelIdSchema),
  getHostelHandler,
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

export default router;
