import app from "./app";
import env from "./config/env";
import connectDB from "./config/database";
import logger from "./utils/logger";
const PORT = env.port;

const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`App is listening on ${PORT}`);
  });
};

startServer();
