import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validate";
import {
  createTicketSchema,
  listTicketsQuerySchema,
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

router.post("/", validateBody(createTicketSchema), createTicketHandler);
router.get("/:id", getTicketHandler);
router.get("/", validateQuery(listTicketsQuerySchema), listTicketsHandler);
router.patch("/:id", validateBody(updateTicketSchema), updateTicketHandler);
router.delete("/:id", deleteTicketHandler);

export default router;
