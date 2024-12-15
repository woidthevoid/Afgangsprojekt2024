module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    globals: {
      'ts-jest': {
        tsconfig: 'tsconfig.json',
      },
    },
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
      "\\.(glb)$": "<rootDir>/src/__mocks__/fileMock.ts",
    },
    transform: {
      "^.+\\.ts$": "ts-jest"
    },
  };