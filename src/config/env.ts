import dotenv from "dotenv";
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "",
  accessTokenTtl: Number(process.env.ACCESS_TOKEN_TTL) || 900, // 15 minutes in seconds
  refreshTokenTtl: Number(process.env.REFRESH_TOKEN_TTL) || 604800,
};

export default env;
