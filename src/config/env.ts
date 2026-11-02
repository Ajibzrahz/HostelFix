
import dotenv from "dotenv";

if (process.env.NODE_ENV !== "test") {
  dotenv.config({ quiet: true });
}

const nodeEnv = process.env.NODE_ENV || "development";

const env = {
  nodeEnv,
  port: Number(process.env.PORT) || 5000,
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
  emailProvider: (process.env.EMAIL_PROVIDER || "mailtrap")
    .trim()
    .toLowerCase(),

  clientUrl:
    process.env.CLIENT_URL || "http://localhost:3000",
  serverUrl:
    process.env.SERVER_URL || "http://localhost:5000",
};

// Validate production configuration
if (nodeEnv === "production") {
  const requiredVariables = [
    "MONGO_URI",
    "ACCESS_TOKEN_SECRET",
    "REFRESH_TOKEN_SECRET",
    "CLIENT_URL",
    "SERVER_URL",
    "MAIL_FROM",
    "EMAIL_PROVIDER",
  ];

  const missingVariables = requiredVariables.filter(
    (key) => !process.env[key]?.trim(),
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVariables.join(", ")}`,
    );
  }

  if (!["mailtrap", "brevo"].includes(env.emailProvider)) {
    throw new Error("EMAIL_PROVIDER must be either mailtrap or brevo");
  }

  if (
    env.emailProvider === "mailtrap" &&
    (!env.mailtrapHost || !env.mailtrapUser || !env.mailtrapPass)
  ) {
    throw new Error("Mailtrap configuration is incomplete");
  }

  if (env.emailProvider === "brevo" && !env.brevoApiKey) {
    throw new Error("BREVO_API_KEY is required when using Brevo");
  }
}

export default env;
