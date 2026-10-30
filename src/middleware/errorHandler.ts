import type { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import logger from "../common/utils/logger";
import { AppError } from "../common/utils/app-error";

type BodyParserError = { status: number; type: string };

const isBodyParserError = (err: unknown): err is BodyParserError =>
  typeof err === "object" &&
  err !== null &&
  typeof (err as { type?: unknown }).type === "string" &&
  (err as { type: string }).type.startsWith("entity.") &&
  typeof (err as { status?: unknown }).status === "number";

type DuplicateKeyError = { code: 11000; keyValue: Record<string, unknown> };

const isDuplicateKeyError = (err: unknown): err is DuplicateKeyError =>
  typeof err === "object" &&
  err !== null &&
  (err as { code?: unknown }).code === 11000;

const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (res.headersSent) return next(err);

  let statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong, try again later";
  let details: unknown;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof ZodError) {
    statusCode = StatusCodes.BAD_REQUEST;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
    }));
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = StatusCodes.BAD_REQUEST;
    code = "VALIDATION_ERROR";
    message = "Request validation failed";
    details = Object.values(err.errors).map((item) => ({
      field: item.path,
      message: item.message,
    }));
  } else if (isDuplicateKeyError(err)) {
    statusCode = StatusCodes.CONFLICT;
    code = "CONFLICT";
    message = `Duplicate value for ${Object.keys(err.keyValue).join(", ")}`;
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = StatusCodes.BAD_REQUEST;
    code = "INVALID_ID";
    message = `Invalid value for ${err.path}: ${err.value}`;
  } else if (isBodyParserError(err)) {
    const tooLarge = err.status === 413;
    statusCode = tooLarge
      ? StatusCodes.REQUEST_TOO_LONG
      : StatusCodes.BAD_REQUEST;
    code = tooLarge ? "PAYLOAD_TOO_LARGE" : "INVALID_JSON";
    message = tooLarge
      ? "Request body is too large"
      : "Request body is not valid JSON";
  } else {
    logger.error(err); // only unexpected errors get logged as errors
  }

  return res.status(statusCode).json({
    error: { code, message, ...(details ? { details } : {}) },
  });
};

export default errorHandler;
