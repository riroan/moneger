const path = require('path');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.{ts,tsx}'],
  transformIgnorePatterns: [
    'node_modules/\\.pnpm/(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|zustand|@testing-library))',
    'node_modules/(?!\\.pnpm)(?!(react-native|@react-native|expo|@expo|react-navigation|@react-navigation|zustand|@testing-library|@moneger))',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'stores/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  moduleDirectories: ['node_modules', path.join(__dirname, '../../node_modules')],
  // Use node environment to avoid window conflicts
  testEnvironment: 'node',
};
