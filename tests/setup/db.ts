import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// no real emails in tests
jest.mock("../../src/common/service/email-service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});