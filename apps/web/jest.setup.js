// Jest DOM 매처 추가
import '@testing-library/jest-dom'

// Import ponyfills from edge-runtime (TextEncoder/TextDecoder already set in jest.globals.js)
import { Headers, Request, Response } from '@edge-runtime/ponyfill'

// Setup edge-runtime polyfills for Next.js API routes
global.Headers = Headers
global.Request = Request
global.Response = Response

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock fetch
global.fetch = jest.fn()

// 각 테스트 전에 모든 mock 초기화
beforeEach(() => {
  jest.clearAllMocks()

  // localStorage mock도 재설정
  localStorageMock.getItem.mockReturnValue(null)
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
})
