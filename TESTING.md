# 테스트 가이드

## 개요

Moneger 프로젝트는 Jest와 React Testing Library를 사용하여 프론트엔드 및 백엔드 코드를 테스트합니다.

## 테스트 실행

### 모든 테스트 실행
```bash
npm test
```

### 테스트 감시 모드 (개발 중)
```bash
npm run test:watch
```

### 커버리지 리포트 생성
```bash
npm run test:coverage
```

## 테스트 구조

### 백엔드 API 테스트
API 라우트 테스트는 각 API 폴더 내 `__tests__` 디렉토리에 위치합니다.

```
app/api/
├── transactions/
│   ├── __tests__/
│   │   └── route.test.ts
│   ├── summary/
│   │   └── __tests__/
│   │       └── route.test.ts
│   └── route.ts
└── categories/
    ├── __tests__/
    │   └── route.test.ts
    └── route.ts
```

#### 예시: Transaction API 테스트
```typescript
describe('POST /api/transactions', () => {
  it('거래를 성공적으로 생성해야 함', async () => {
    // 테스트 코드
  });

  it('userId가 없으면 400 에러를 반환해야 함', async () => {
    // 테스트 코드
  });
});
```

### 프론트엔드 컴포넌트 테스트
페이지 및 컴포넌트 테스트는 각 폴더 내 `__tests__` 디렉토리에 위치합니다.

```
app/
├── login/
│   ├── __tests__/
│   │   └── page.test.tsx
│   └── page.tsx
```

#### 예시: Login 페이지 테스트
```typescript
describe('LoginPage', () => {
  it('로그인 폼이 렌더링되어야 함', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('이메일')).toBeInTheDocument();
  });

  it('성공적으로 로그인하면 메인 페이지로 이동해야 함', async () => {
    // 테스트 코드
  });
});
```

### 유틸리티 함수 테스트
유틸리티 함수 테스트는 프로젝트 루트의 `__tests__/utils` 디렉토리에 위치합니다.

```
__tests__/
└── utils/
    └── formatters.test.ts
```

## 작성된 테스트

### 백엔드 API 테스트
1. **POST /api/transactions** - 거래 생성 API
   - ✅ 거래 성공적 생성
   - ✅ 유효성 검사 (userId, type, amount)
   - ✅ 에러 처리

2. **GET /api/transactions/summary** - 거래 요약 API
   - ✅ 월별 요약 통계 반환
   - ✅ 카테고리별 통계 정렬
   - ✅ 예산 정보 포함
   - ✅ 유효성 검사

3. **GET/POST /api/categories** - 카테고리 API
   - ✅ 카테고리 목록 조회
   - ✅ 카테고리 생성
   - ✅ 중복 검사
   - ✅ 유효성 검사

### 프론트엔드 테스트
1. **로그인 페이지**
   - ✅ 폼 렌더링
   - ✅ 입력 필드 동작
   - ✅ 로그인 성공 처리
   - ✅ 로그인 실패 처리
   - ✅ 회원가입 링크

2. **유틸리티 함수**
   - ✅ formatNumber - 숫자 포맷팅
   - ✅ handleAmountChange - 금액 입력 검증
   - ✅ formatDate - 날짜 포맷팅
   - ✅ formatYearMonth - 연월 포맷팅

## 테스트 작성 가이드

### Mock 사용

#### Prisma Mock
```typescript
jest.mock('@/lib/prisma', () => ({
  prisma: {
    transaction: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));
```

#### Next.js Router Mock
```typescript
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));
```

#### Fetch Mock
```typescript
global.fetch = jest.fn();
mockFetch.mockResolvedValueOnce({
  ok: true,
  json: async () => ({ success: true, data: {} }),
});
```

### 테스트 패턴

#### API 테스트
```typescript
it('설명', async () => {
  // Given: 테스트 데이터 준비
  const mockData = { /* ... */ };
  (prisma.model.method as jest.Mock).mockResolvedValue(mockData);

  // When: API 호출
  const request = new NextRequest(url, { method, body });
  const response = await HANDLER(request);
  const data = await response.json();

  // Then: 결과 검증
  expect(response.status).toBe(200);
  expect(data.success).toBe(true);
});
```

#### 컴포넌트 테스트
```typescript
it('설명', async () => {
  // Given: 컴포넌트 렌더링
  const user = userEvent.setup();
  render(<Component />);

  // When: 사용자 인터랙션
  await user.click(screen.getByRole('button'));

  // Then: 결과 검증
  expect(screen.getByText('결과')).toBeInTheDocument();
});
```

## 커버리지 목표

- **전체 코드**: 80% 이상
- **API 라우트**: 90% 이상
- **유틸리티 함수**: 95% 이상

## CI/CD 통합

GitHub Actions에서 자동으로 테스트를 실행합니다:

```yaml
- name: Run tests
  run: npm test

- name: Upload coverage
  run: npm run test:coverage
```

## 문제 해결

### 테스트가 실패하는 경우
1. Mock이 올바르게 설정되었는지 확인
2. 비동기 작업에 `await`를 사용했는지 확인
3. `waitFor`를 사용하여 비동기 업데이트 대기

### 커버리지가 낮은 경우
1. `npm run test:coverage`로 커버리지 리포트 확인
2. 커버되지 않은 코드 블록 확인
3. 엣지 케이스 테스트 추가

## 참고 자료

- [Jest 공식 문서](https://jestjs.io/)
- [React Testing Library 문서](https://testing-library.com/react)
- [Next.js 테스트 가이드](https://nextjs.org/docs/testing)
