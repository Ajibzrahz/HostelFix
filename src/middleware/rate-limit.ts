import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";
import env from "../config/env";
import { AppError } from "../common/utils/app-error";

type LimiterOptions = {
  windowMs: number;
  limit: number;
  message?: string;
  // count only failed requests (status 400 and above), for example failed logins
  skipSuccessfulRequests?: boolean;
  // the real limiters are switched off in tests, so test runs never hit them
  skipInTests?: boolean;
};

export const createRateLimiter = ({
  windowMs,
  limit,
  message = "Too many requests, please try again later",
  skipSuccessfulRequests = false,
  skipInTests = false,
}: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    skip: () => skipInTests && env.nodeEnv === "test",
    // pass the error on so it uses the standard error format
    handler: (_req, _res, next) =>
      next(new AppError(StatusCodes.TOO_MANY_REQUESTS, "RATE_LIMITED", message)),
  });

const MINUTE = 60 * 1000;

// the whole API, generous
export const apiLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 300,
  skipInTests: true,
});

// only failed logins count, so normal users are never blocked
export const loginLimiter = createRateLimiter({
  windowMs: 15 * MINUTE,
  limit: 10,
  skipSuccessfulRequests: true,
  message: "Too many failed login attempts, please try again in 15 minutes",
  skipInTests: true,
});

export const registerLimiter = createRateLimiter({
  windowMs: 60 * MINUTE,
  limit: 10,
  message: "Too many sign-ups from this address, please try again later",
  skipInTests: true,
});

// each request sends an email, so keep this one tight
export const emailLimiter = createRateLimiter({
  windowMs: 60 * MINUTE,
  limit: 5,
  message: "Too many email requests, please try again later",
  skipInTests: true,
});