import dotenv from "dotenv";
dotenv.config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || "",

  accessTokenSecret: process.env.ACCESS_TOKEN_SECRET || "",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || "",
  accessTokenTtl: Number(process.env.ACCESS_TOKEN_TTL) || 900,
  refreshTokenTtl: Number(process.env.REFRESH_TOKEN_TTL) || 604800,

  mailFrom: process.env.MAIL_FROM || "",
  mailtrapHost: process.env.MAILTRAP_HOST || "",
  mailtrapPort: Number(process.env.MAILTRAP_PORT) || 2525,
  mailtrapUser: process.env.MAILTRAP_USER || "",
  mailtrapPass: process.env.MAILTRAP_PASS || "",

  brevoApiKey: process.env.BREVO_API_KEY || "",
  emailProvider: (process.env.EMAIL_PROVIDER || "mailtrap").trim().toLocaleLowerCase(),

  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  serverUrl: process.env.SERVER_URL || "http://localhost:5000"
};

export default env;
