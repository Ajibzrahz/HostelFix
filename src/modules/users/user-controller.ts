import { Request, Response } from "express";
import * as userService from "./user-service";
import { StatusCodes } from "http-status-codes";
import { GetUserInput, UpdateUserInput } from "./user-schema";

export const getUserHandler = async (
  req: Request<GetUserInput>,
  res: Response,
) => {
  const user = await userService.getUser(String(req.params.userId));

  return res.status(StatusCodes.OK).json({ user });
};

export const updateUserHandler = async (
  req: Request<GetUserInput, {}, UpdateUserInput>,
  res: Response,
) => {
  const user = await userService.updateUser(
    String(req.params.userId),
    req.body,
  );

  return res.status(StatusCodes.OK).json({ user });
};
