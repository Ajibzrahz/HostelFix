import { Router } from "express";
import validate from "../../middleware/validate";
import {
  createTicketSchema,
  listTicketsQuerySchema,
  ticketIdSchema,
  updateTicketSchema,
} from "./ticket-schema";
import {
  createTicketHandler,
  deleteTicketHandler,
  getTicketHandler,
  listTicketsHandler,
  updateTicketHandler,
} from "./ticket-controller";

const router = Router();

router.post("/", validate(createTicketSchema), createTicketHandler);
router.get("/:id", validate(ticketIdSchema), getTicketHandler);
router.get("/", validate(listTicketsQuerySchema), listTicketsHandler);
router.patch("/:id", validate(updateTicketSchema), updateTicketHandler);
router.delete("/:id", validate(ticketIdSchema), deleteTicketHandler);

export default router;
