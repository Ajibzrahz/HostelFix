import { Request, Response } from "express";
import * as TicketService from "./ticket-service";
import { StatusCodes } from "http-status-codes";

export const createTicketHandler = async (req: Request, res: Response) => {
  const ticket = await TicketService.createTicket(req.body);
  return res.status(StatusCodes.CREATED).json(ticket);
};

export const getTicketHandler = async (req: Request, res: Response) => {
  const ticket = await TicketService.getTicket(String(req.params.id));
  return res.status(StatusCodes.CREATED).json(ticket);
};
