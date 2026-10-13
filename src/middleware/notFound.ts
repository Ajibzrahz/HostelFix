import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error";

const notFound = (req: Request, res: Response, next: NextFunction) => {
  next(new AppError(404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`));
};

export default notFound;