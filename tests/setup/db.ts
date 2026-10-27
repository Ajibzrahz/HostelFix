import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import os from "node:os";

jest.mock("../../src/common/service/email-service", () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

let mongo: MongoMemoryServer | undefined;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create({
    binary: {
      version: "8.3.9",
    },
  });
  await mongoose.connect(mongo.getUri(), {
    driverInfo: {
      name: "mongoose",
      version: mongoose.version,
    },
    // Workaround for MongoDB driver 7.6+ runtime adapter resolution in Jest
    runtimeAdapters: {
      os,
    },
  });
}, 180000);

afterEach(async () => {
  if (mongoose.connection.readyState !== 1) return;
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo?.stop();
});
