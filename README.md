# Moneger

스마트한 가계부 관리 웹 서비스

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Charts**: Recharts
- **Package Manager**: Yarn

## 주요 기능

- 수입/지출 내역 관리
- 카테고리별 분류 및 통계
- 월별 요약 대시보드
- 거래 내역 필터링 (날짜, 금액, 카테고리, 검색어)
- 다크/라이트 모드 지원
- 반응형 디자인 (모바일/데스크톱)

## 스크린샷

### 대시보드

- 월별 수입/지출 요약
- 카테고리별 지출 차트
- 최근 거래 내역

### 전체 내역

- 무한 스크롤 거래 목록
- 다양한 필터 옵션
- 거래 수정/삭제

## 데이터베이스 모델

### User

사용자 정보 관리

### Transaction

수입/지출 거래 내역

- 인덱스: `[userId, date]`, `[categoryId]`, `[userId, type]`, `[userId, deletedAt, date]`

### Category

거래 카테고리 (수입/지출 구분)

- 인덱스: `[userId, deletedAt]`

### Budget

월별 예산 설정

### DailyBalance

일별 잔액 추적

## 시작하기

### 사전 요구사항

- Node.js 24.x
- PostgreSQL
- Yarn

### 설치

```bash
# 의존성 설치
yarn install

# 환경 변수 설정
cp .env.example .env
# .env 파일에서 DATABASE_URL 설정

# 데이터베이스 마이그레이션
yarn prisma migrate dev

# Prisma Client 생성
yarn prisma generate
```

### 개발 서버 실행

```bash
yarn dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 개발 명령어

```bash
# 개발 서버 실행
yarn dev

# 프로덕션 빌드
yarn build

# 프로덕션 서버 실행
yarn start

# 린트 검사
yarn lint

# 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# Prisma Studio 실행 (데이터베이스 GUI)
yarn prisma studio
```

## 프로젝트 구조

```
moneger/
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API 라우트
│   ├── login/             # 로그인 페이지
│   └── settings/          # 설정 페이지
├── components/            # React 컴포넌트
│   ├── dashboard/         # 대시보드 컴포넌트
│   ├── layout/            # 레이아웃 컴포넌트
│   ├── modals/            # 모달 컴포넌트
│   └── transactions/      # 거래 관련 컴포넌트
├── contexts/              # React Context
├── hooks/                 # 커스텀 훅
├── lib/                   # 유틸리티 및 서비스
│   ├── services/          # 비즈니스 로직
│   └── prisma.ts          # Prisma Client
├── prisma/                # Prisma 스키마 및 마이그레이션
├── public/                # 정적 파일
└── utils/                 # 유틸리티 함수
```

## 성능 최적화

- **DB 집계 최적화**: Prisma `aggregate`/`groupBy`를 활용한 DB 레벨 집계
- **API 병렬 호출**: `Promise.all`을 활용한 초기 데이터 로딩 최적화
- **코드 스플리팅**: 모달 컴포넌트 동적 임포트
- **메모이제이션**: `useMemo`/`useCallback`을 활용한 불필요한 리렌더링 방지
- **DB 인덱스**: 자주 사용되는 쿼리 패턴에 맞는 복합 인덱스 설정

## 환경 변수

`.env` 파일에 다음 환경 변수를 설정하세요:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/moneger?schema=public"
```
