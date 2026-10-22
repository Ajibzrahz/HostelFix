import { NextFunction, Request, Response } from "express";
import env from "../config/env";
import { verifyJwt } from "../common/utils/jwt-utils.";
import { reIssueAccessToken } from "../modules/sessions/session-service";

const deserializeUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const { accessToken, refreshToken } = req.cookies ?? {};

  if (accessToken) {
    const { decoded } = verifyJwt(accessToken, env.accessTokenSecret);
    if (decoded) {
      res.locals.user = decoded;
      return next();
    }
  }

  if (typeof refreshToken === "string") {
    const newAccessToken = await reIssueAccessToken({ refreshToken });

    if (newAccessToken) {
      const { decoded } = verifyJwt(newAccessToken, env.accessTokenSecret);

      if (decoded) {
        res.cookie("accessToken", newAccessToken, {
          maxAge: env.accessTokenTtl * 1000,
          httpOnly: true,
          secure: env.nodeEnv === "production",
          sameSite: "strict",
        });

        res.locals.user = decoded;
      }
    }
  }

  return next();
};

export default deserializeUser;
