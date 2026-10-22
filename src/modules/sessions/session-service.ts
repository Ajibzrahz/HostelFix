import { QueryFilter, UpdateQuery } from "mongoose";
import sessionModel, { sessionDocument } from "./session-model";
import { verifyJwt, signJwt } from "../../common/utils/jwt-utils.";
import { get, omit } from "lodash";
import User from "../users/user-model";
import env from "../../config/env";

export async function createUserSession(userId: string, userAgent: string) {
  const session = await sessionModel.create({ user: userId, userAgent });

  return session;
}

export async function findSession(query: QueryFilter<sessionDocument>) {
  return await sessionModel.findOne(query);
}

export async function updateSession(
  query: QueryFilter<sessionDocument>,
  update: UpdateQuery<sessionDocument>,
) {
  return await sessionModel.updateOne(query, update);
}

export async function reIssueAccessToken({
  refreshToken,
}: {
  refreshToken: string;
}) {
  const { decoded } = verifyJwt(refreshToken, env.refreshTokenSecret);

  if (!decoded) return false;

  const sessionId = get(decoded, "session");

  if (!sessionId) return false;

  const session = await sessionModel.findById(sessionId);

  if (!session || session.valid === false) return false;

  const user = await User.findById(session.user);

  if (!user) return false;

  const accessToken = signJwt(
    { sub: user._id.toString(), role: user.role, session: sessionId },
    env.accessTokenSecret,
    { expiresIn: env.accessTokenTtl },
  );

  return accessToken;
}

export async function isSessionValid(sessionId: string) {
  const session = await sessionModel.findById(sessionId);
  return !!session && session.valid;
}