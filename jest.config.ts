/** @type {import('ts-jest').JestConfigWithTsJest} */
import type { Config } from "jest";
const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["<rootDir>/dist/", "<rootDir>/node_modules/"],
};

export default config;
