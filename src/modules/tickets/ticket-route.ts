import { Router } from "express";
import validate from "../../middleware/validate";
import { createTicketSchema } from "./ticket-schema";
import { createTicketHandler, getTicketHandler } from "./ticket-controller";

const router = Router();

router.post("/", validate(createTicketSchema), createTicketHandler);
router.get("/:id", getTicketHandler);

export default router;
