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
import requireUser from "../../middleware/require-user";
import requireRole from "../../middleware/require-role";

const router = Router();

router.use(requireUser);

router.post("/", validate(createTicketSchema), createTicketHandler);
router.get("/:id", validate(ticketIdSchema), getTicketHandler);
router.get("/", validate(listTicketsQuerySchema), listTicketsHandler);
router.patch("/:id", validate(updateTicketSchema), updateTicketHandler);
router.delete(
  "/:id",
  requireRole("admin"),
  validate(ticketIdSchema),
  deleteTicketHandler,
);

export default router;
