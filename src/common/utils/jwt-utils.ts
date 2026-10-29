import jwt from "jsonwebtoken";

export const signJwt = (
  object: Object,
  secret: string,
  options?: jwt.SignOptions | undefined,
) => {
  return jwt.sign(object, secret, {
    ...(options && options),
    algorithm: "HS256",
  });
};

export const verifyJwt = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret);
    return {
      valid: true,
      expired: false,
      decoded,
    };
  } catch (error: unknown) {
    const expired = error instanceof jwt.TokenExpiredError;
    return {
      valid: false,
      expired,
      decoded: null,
    };
  }
};
