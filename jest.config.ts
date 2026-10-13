import type { Config } from "jest";

const config: Config = {
  testEnvironment: "node",

  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  roots: ["<rootDir>/tests"],

  testMatch: ["**/*.test.ts"],

  clearMocks: true,
  restoreMocks: true,

  coverageDirectory: "coverage",

  collectCoverageFrom: ["src/**/*.ts", "!src/server.ts"],
};

export default config;
