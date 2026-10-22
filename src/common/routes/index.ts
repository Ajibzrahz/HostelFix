import { Router } from "express";
import ticketRouter from "../../modules/tickets/ticket-route";
import authRouter from "../../modules/auth/auth-route";
import userRouter from "../../modules/users/user-route";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/tickets", ticketRouter);

export default router;