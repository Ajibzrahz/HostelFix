import { Request, Response } from "express";
import * as userService from "./auth-service";
import { omit } from "lodash";
import {
  CreateUserInput,
  LoginInput,
  ResendVerificationInput,
  VerifyEmailInput,
} from "../users/user-schema";
import { validatePassword } from "./auth-service";
import { StatusCodes } from "http-status-codes";
import env from "../../config/env";
import { createUserSession, updateSession } from "../sessions/session-service";
import { signJwt } from "../../common/utils/jwt-utils";
import { AppError } from "../../common/utils/app-error";

export const createUserHandler = async (
  req: Request<{}, {}, CreateUserInput>,
  res: Response,
) => {
  const { user, emailSent } = await userService.createUser(req.body);

  return res.status(StatusCodes.CREATED).json({
    message: emailSent
      ? "Account created. Please check your email to verify your account."
      : "Account created, but we could not send the verification email. Please request a new one.",
    user: omit(user.toJSON(), [
      "passwordHash",
      "emailVerificationTokenHash",
      "emailVerificationTokenExpiresAt",
    ]),
  });
};
export const verifyEmailHandler = async (
  req: Request<{}, {}, {}, VerifyEmailInput>,
  res: Response,
) => {
  await userService.verifyEmail(res.locals.query);

  return res.status(StatusCodes.OK).json({
    message: "Email verified successfully. You can now log in.",
  });
};

export const resendVerificationHandler = async (
  req: Request<{}, {}, ResendVerificationInput>,
  res: Response,
) => {
  await userService.resendVerificationEmail(req.body.email);

  return res.status(StatusCodes.OK).json({
    message:
      "If that account exists and is not verified, a new link has been sent.",
  });
};

export const loginHandler = async (
  req: Request<{}, {}, LoginInput>,
  res: Response,
) => {
  const user = await validatePassword(req.body);

  if (!user) {
    throw new AppError(
      StatusCodes.UNAUTHORIZED,
      "UNAUTHORIZED",
      "Invalid email or password",
    );
  }

  if (!user.isEmailVerified) {
    throw new AppError(
      StatusCodes.FORBIDDEN,
      "EMAIL_NOT_VERIFIED",
      "Please verify your email before logging in",
    );
  }

  const session = await createUserSession(
    user._id.toString(),
    req.get("user-agent") ?? "unkown",
  );
  const sessionId = session._id.toString();

  const accessToken = signJwt(
    { sub: user._id.toString(), role: user.role, session: sessionId },
    env.accessTokenSecret,
    { expiresIn: env.accessTokenTtl },
  );
  const refreshToken = signJwt(
    { sub: user._id.toString(), session: sessionId },
    env.refreshTokenSecret,
    { expiresIn: env.refreshTokenTtl },
  );

  res.cookie("accessToken", accessToken, {
    maxAge: env.accessTokenTtl * 1000,
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
  });

  res.cookie("refreshToken", refreshToken, {
    maxAge: env.refreshTokenTtl * 1000,
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
  });

  return res.status(StatusCodes.OK).json({
    message: "Login successful",
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
};

export const logoutHandler = async (req: Request, res: Response) => {
  const sessionId = res.locals.user.session;

  await updateSession({ _id: sessionId }, { valid: false });

  res.clearCookie("accessToken", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
  });

  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: env.nodeEnv === "production",
    sameSite: "strict",
  });

  return res.status(StatusCodes.OK).json({
    status: "success",
  });
};
