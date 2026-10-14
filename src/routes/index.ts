import { Router } from "express";
import ticketRouter from "../modules/tickets/ticket-route";

const router = Router();

router.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is healthy",
  });
});

router.use("/tickets", ticketRouter);

export default router;
