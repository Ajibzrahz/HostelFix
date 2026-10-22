import { Router } from "express";
import ticketRouter from "../../modules/tickets/ticket-route";
import authRouter from "../../modules/auth/auth-route";
import userRouter from "../../modules/users/user-route";
import hostelRouter from "../../modules/hostels/hostel-route";
import deserializeUser from "../../middleware/deserializeUser";

const router = Router();

router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/hostels", deserializeUser, hostelRouter);
router.use("/tickets", ticketRouter);

export default router;
