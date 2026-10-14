import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export const validateBody =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body); // throws ZodError, handled by errorHandler
    next();
  };

  export const validateQuery =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    res.locals.query = schema.parse(req.query);
    next();
  };