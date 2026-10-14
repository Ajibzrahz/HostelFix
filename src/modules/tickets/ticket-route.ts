import { Router } from "express";
import validate from "../../middleware/validate";
import { createTicketSchema } from "./ticket-schema";
import { createTicketHandler } from "./ticket-controller";

const router = Router();

router.post("/", validate(createTicketSchema), createTicketHandler);

export default router;
