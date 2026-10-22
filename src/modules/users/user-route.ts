import { Router } from "express";
import validate from "../../middleware/validate";
import { updateUserSchema } from "./user-schema";
import requireUser from "../../middleware/require-user";
import { getUserHandler, updateUserHandler } from "./user-controller";
import deserializeUser from "../../middleware/deserializeUser";

const router = Router();

router.get("/:userId", getUserHandler);
router.patch(
  "/:userId",
  deserializeUser,
  requireUser,
  validate(updateUserSchema),
  updateUserHandler,
);

export default router;
