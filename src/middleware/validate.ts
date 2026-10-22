import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

const validate =
  (schema: ZodType) => (req: Request, res: Response, next: NextFunction) => {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    }) as { body?: unknown; query?: unknown; params?: unknown };

    req.body = parsed.body ?? req.body;
    res.locals.query = parsed.query;
    res.locals.params = parsed.params;
    next();
  };

export default validate;
