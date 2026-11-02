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
  getCurrentUserHandler,
  loginHandler,
  logoutHandler,
  resendVerificationHandler,
  verifyEmailHandler,
} from "./auth-controller";
import {
  emailLimiter,
  loginLimiter,
  registerLimiter,
} from "../../middleware/rate-limit";
import deserializeUser from "../../middleware/deserializeUser";
import requireUser from "../../middleware/require-user";

const router = Router();

router.post(
  "/register",
  registerLimiter,
  validate(createUserSchema),
  createUserHandler,
);
router.get("/verify-email", validate(verifyEmailSchema), verifyEmailHandler);
router.post(
  "/resend-verification",
  emailLimiter,
  validate(resendVerificationSchema),
  resendVerificationHandler,
);
router.post("/login", loginLimiter, validate(loginSchema), loginHandler);
router.delete("/logout", requireUser, logoutHandler);
router.get("/me", requireUser, getCurrentUserHandler);

export default router;
