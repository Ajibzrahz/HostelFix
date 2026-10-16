import express from "express";
import cors from "cors";

import cookieParser from "cookie-parser";
import routes from "./routes";
import notFound from "./middleware/notFound";
import errorHandler from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime() });
});


// Route
app.use("/api/v1", routes);

app.use(notFound)
app.use(errorHandler)

// Health check
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

export default app;
