import type { Config } from "jest";

const config: Config = {
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: "tsconfig.jest.json",
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/__tests__/__mocks__/styleMock.ts",
  },
  setupFiles: ["<rootDir>/jest.setup.tsx"],
  testMatch: ["<rootDir>/__tests__/pages/**/*.test.tsx"],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/.next/"],
  transformIgnorePatterns: ["node_modules/(?!(lucide-react)/)"],
};

export default config;
