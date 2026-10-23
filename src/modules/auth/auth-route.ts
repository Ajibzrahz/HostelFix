import { Router } from "express";
import validate from "../../middleware/validate";
import {
  createUserSchema,
  loginSchema,
  resendVerificationSchema,
  verifyEmailSchema,
} from "../users/user-schema";
import {
  createUserHandler,
  loginHandler,
  logoutHandler,
  resendVerificationHandler,
  verifyEmailHandler,
} from "./auth-controller";
import deserializeUser from "../../middleware/deserializeUser";
import requireUser from "../../middleware/require-user";

const router = Router();

router.post("/register", validate(createUserSchema), createUserHandler);
router.get("/verify-email", validate(verifyEmailSchema), verifyEmailHandler);
router.post(
  "/resend-verification",
  validate(resendVerificationSchema),
  resendVerificationHandler,
);
router.post("/login", validate(loginSchema), loginHandler);
router.delete("/logout", requireUser, logoutHandler);

export default router;
