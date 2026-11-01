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


const allowedOrigins = env.clientUrl
.split(",")
.map((url) => url.trim().replace(/\/$/, ""));

// Middleware
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});

// Route
app.use("/api/v1", apiLimiter, routes);

app.use(notFound);
app.use(errorHandler);

export default app;
