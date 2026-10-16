import { Router } from "express";
import ticketRouter from "../modules/tickets/ticket-route";

const router = Router();

router.use("/tickets", ticketRouter);

export default router;
