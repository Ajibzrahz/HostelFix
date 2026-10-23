import { Request, Response } from "express";
import * as hostelService from "./hostel-service";
import { StatusCodes } from "http-status-codes";
import { ListHostelsQuery, UpdateHostelInput } from "./hostel-schema";

export const createHostelHandler = async (req: Request, res: Response) => {
  const hostel = await hostelService.createHostel(req.body);
  return res.status(StatusCodes.CREATED).json(hostel);
};

export const getHostelHandler = async (req: Request, res: Response) => {
  const hostel = await hostelService.getHostel(
    String(res.locals.params.hostelId),
  );

  return res.status(StatusCodes.OK).json(hostel);
};

export const listHostelsHandler = async (req: Request, res: Response) => {
  const hostels = await hostelService.listHostel(
    res.locals.query as ListHostelsQuery,
  );
  return res.status(StatusCodes.OK).json(hostels);
};

export const updateHostelHandler = async (
  req: Request<UpdateHostelInput["params"], {}, UpdateHostelInput["body"]>,
  res: Response,
) => {
  const hostels = await hostelService.updateHostel(
    String(res.locals.params.hostelId),
    req.body,
  );

  return res.status(StatusCodes.OK).json(hostels);
};

export const deleteHostelHandler = async (_req: Request, res: Response) => {
  await hostelService.deleteHostel(String(res.locals.params.hostelId));
  return res.status(StatusCodes.NO_CONTENT).send();
};