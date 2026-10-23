import { Request, Response } from "express";
import * as ticketService from "./ticket-service";
import type {
  CreateTicketInput,
  ListTicketsQuery,
  UpdateTicketInput,
} from "./ticket-schema";
import { StatusCodes } from "http-status-codes";
import { Actor } from "./ticket-service";

export const createTicketHandler = async (
  req: Request<{}, {}, CreateTicketInput>,
  res: Response,
) => {
  const actor = res.locals.user as Actor;
  const ticket = await ticketService.createTicket(req.body, actor);
  return res.status(StatusCodes.CREATED).json(ticket);
};

export const getTicketHandler = async (req: Request, res: Response) => {
  const actor = res.locals.user as Actor;
  const ticket = await ticketService.getTicket(
    String(res.locals.params.id),
    actor,
  );
  return res.status(StatusCodes.OK).json(ticket);
};

export const listTicketsHandler = async (_req: Request, res: Response) => {
  const result = await ticketService.listTickets(
    res.locals.query as ListTicketsQuery,
    res.locals.user as Actor,
  );
  res.status(StatusCodes.OK).json(result);
};

export const updateTicketHandler = async (
  req: Request<UpdateTicketInput["params"], {}, UpdateTicketInput["body"]>,
  res: Response,
) => {
  const actor = res.locals.user as Actor;
  const ticketId = res.locals.params.id;
  const ticket = await ticketService.updateTicket(
    String(ticketId),
    req.body,
    actor,
  );
  return res.status(StatusCodes.OK).json(ticket);
};

export const deleteTicketHandler = async (req: Request, res: Response) => {
  const ticketId = res.locals.params.id;
  await ticketService.deleteTicket(String(ticketId));
  return res.status(StatusCodes.NO_CONTENT).send();
};
