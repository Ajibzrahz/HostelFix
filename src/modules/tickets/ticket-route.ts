import { Router } from "express";
import { validateBody, validateQuery } from "../../middleware/validate";
import { createTicketSchema, listTicketsQuerySchema } from "./ticket-schema";
import { createTicketHandler, getTicketHandler, listTicketsHandler } from "./ticket-controller";

const router = Router();

router.post("/", validateBody(createTicketSchema), createTicketHandler);
router.get("/:id", getTicketHandler);
router.get("/", validateQuery(listTicketsQuerySchema), listTicketsHandler);

export default router;
