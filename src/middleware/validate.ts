import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

const validate =
  (schema: ZodType) => (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body); // throws ZodError, handled by errorHandler
    next();
  };

export default validate;
