import { Request, Response } from "express";
import * as ticketService from "./ticket-service";
import type { ListTicketsQuery } from "./ticket-schema";
import { StatusCodes } from "http-status-codes";

export const createTicketHandler = async (req: Request, res: Response) => {
  const ticket = await ticketService.createTicket(req.body);
  return res.status(StatusCodes.CREATED).json(ticket);
};

export const getTicketHandler = async (req: Request, res: Response) => {
  const ticket = await ticketService.getTicket(String(req.params.id));
  return res.status(StatusCodes.CREATED).json(ticket);
};

export const listTicketsHandler = async (_req: Request, res: Response) => {
  const result = await ticketService.listTickets(
    res.locals.query as ListTicketsQuery,
  );
  res.status(StatusCodes.OK).json(result);
};

export const updateTicketHandler = async (req: Request, res: Response) => {
  const ticketId = req.params.id;
  const ticket = await ticketService.updateTicket(String(ticketId), req.body);
  return res.status(StatusCodes.OK).json(ticket);
};

export const deleteTicketHandler = async (req: Request, res: Response) => {
  const ticketId = req.params.id;
  const ticket = await ticketService.deleteTicket(String(ticketId));
  return res.status(StatusCodes.NO_CONTENT).send();
};
