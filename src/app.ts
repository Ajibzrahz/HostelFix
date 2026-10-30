import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import helmet from "helmet";
import env from "./config/env";
import { apiLimiter } from "./middleware/rate-limit";

import routes from "./common/routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/errorHandler";

const app = express();

const allowedOrigins = [env.clientUrl];
// Middleware

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Route
app.use("/api/v1", apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

// Health check
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

export default app;
