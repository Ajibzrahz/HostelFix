import { Request, Response } from "express";
import { findSession, updateSession } from "./session-service";
import { StatusCodes } from "http-status-codes";

export const getUserSessionHandler = async (req: Request, res: Response) => {
  const userId = res.locals.user._id;

  const session = await findSession({ user: userId, valid: true });

  return res.status(StatusCodes.OK).json({ session });
};
