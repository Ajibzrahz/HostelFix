import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../common/utils/app-error";

const requireUser = (_req: Request, res: Response, next: NextFunction) => {
  if (!res.locals.user) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "UNAUTHORIZED",
      "You must be logged in",
    );
  }
  return next();
};

export default requireUser;
