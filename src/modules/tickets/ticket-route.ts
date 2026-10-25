import { Router } from "express";
import validate from "../../middleware/validate";
import {
  assignTicketSchema,
  createTicketSchema,
  listTicketsQuerySchema,
  ticketCommentSchema,
  ticketIdSchema,
  updateStatusSchema,
  updateTicketSchema,
} from "./ticket-schema";
import {
  assignTicketHandler,
  createTicketHandler,
  deleteTicketHandler,
  getTicketHandler,
  listTicketsHandler,
  ticketCommentHandler,
  updateTicketHandler,
  updateTicketStatusHandler,
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

router.post(
  "/:id/comments",
  validate(ticketCommentSchema),
  ticketCommentHandler,
);
router.patch(
  "/:id/assign",
  requireRole("admin", "staff"),
  validate(assignTicketSchema),
  assignTicketHandler,
);
router.patch(
  "/:id/status",
  validate(updateStatusSchema),
  updateTicketStatusHandler,
);

export default router;
