import mongoose from "mongoose";
import env from "./env";
import logger from "../utils/logger";

const MONGO_URI = env.mongoUri;

const connectDB = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGO_URI);

    logger.info(`Database Connected`)

    console.log(`Database Connected`);
  } catch (error) {
    logger.error("MongoDB connection failed");

    logger.error(error);

    process.exit(1);
  }
};

export default connectDB;
