import { Request, Response } from "express";
import * as roomservice from "./room-service";
import { StatusCodes } from "http-status-codes";
import { ListRoomsQuery, UpdateRoomInput } from "./room-schema";

export const createRoomHandler = async (req: Request, res: Response) => {
  const room = await roomservice.createRoom(
    String(res.locals.params.hostelId),
    req.body,
  );
  return res.status(StatusCodes.CREATED).json(room);
};

export const getRoomHandler = async (req: Request, res: Response) => {
  const room = await roomservice.getRoom(String(res.locals.params.roomId));

  return res.status(StatusCodes.OK).json(room);
};

export const listRoomsHandler = async (req: Request, res: Response) => {
  const Rooms = await roomservice.listRooms(res.locals.query as ListRoomsQuery);
  return res.status(StatusCodes.OK).json(Rooms);
};

export const listHostelRoomsHandler = async (_req: Request, res: Response) => {
  const result = await roomservice.listHostelRooms(
    String(res.locals.params.hostelId),
    res.locals.query,
  );
  return res.status(StatusCodes.OK).json(result);
};

export const updateRoomHandler = async (
  req: Request<UpdateRoomInput["params"], {}, UpdateRoomInput["body"]>,
  res: Response,
) => {
  const rooms = await roomservice.updateRoom(
    String(res.locals.params.roomId),
    req.body,
  );

  return res.status(StatusCodes.OK).json(rooms);
};

export const deleteRoomHandler = async (_req: Request, res: Response) => {
  await roomservice.deleteRoom(String(res.locals.params.roomId));
  return res.status(StatusCodes.NO_CONTENT).send();
};
