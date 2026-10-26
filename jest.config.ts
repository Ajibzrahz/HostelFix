import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/*.test.ts"],
  setupFiles: ["<rootDir>/tests/setup/set-env.ts"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup/db.ts"],
  testTimeout: 30000,
  clearMocks: true,
};

export default config;