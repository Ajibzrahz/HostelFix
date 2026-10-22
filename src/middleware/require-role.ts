import { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { AppError } from "../common/utils/app-error";
import type { UserRole } from "../modules/users/user-model";

const requireRole =
  (...roles: UserRole[]) =>
  (_req: Request, res: Response, next: NextFunction) => {
    const user = res.locals.user;

    if (!user) {
      throw new AppError(StatusCodes.UNAUTHORIZED, "UNAUTHORIZED", "You must be logged in");
    }
    if (!roles.includes(user.role)) {
      throw new AppError(StatusCodes.FORBIDDEN, "FORBIDDEN", "You do not have permission to do this");
    }
    return next();
  };

export default requireRole;