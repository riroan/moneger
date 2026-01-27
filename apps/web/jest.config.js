const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // next.config.js와 .env 파일이 로드될 Next.js 앱의 경로 제공
  dir: './',
})

// Jest에 전달할 사용자 정의 설정
const customJestConfig = {
  setupFiles: ['<rootDir>/jest.globals.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testMatch: [
    '**/__tests__/**/*.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/.next/**',
  ],
}

// createJestConfig는 비동기로 Next.js 설정을 로드할 수 있도록 이 방식으로 내보내집니다
module.exports = createJestConfig(customJestConfig)
