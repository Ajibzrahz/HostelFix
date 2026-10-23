import { Router } from "express";
import ticketRouter from "../../modules/tickets/ticket-route";
import authRouter from "../../modules/auth/auth-route";
import userRouter from "../../modules/users/user-route";
import hostelRouter from "../../modules/hostels/hostel-route";
import roomRouter from "../../modules/rooms/room-route";
import deserializeUser from "../../middleware/deserializeUser";

const router = Router();

router.use(deserializeUser)


router.use("/auth", authRouter);
router.use("/users", userRouter);
router.use("/hostels", hostelRouter);
router.use("/rooms", roomRouter);
router.use("/tickets", ticketRouter);

export default router;
