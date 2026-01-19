# Moneger

스마트한 가계부 관리 웹 서비스

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL
- **ORM**: Prisma 7
- **Package Manager**: Yarn

## 주요 기능

- 수입/지출 내역 관리
- 카테고리별 분류
- 월별 예산 설정 및 추적
- 통계 및 리포트

## 데이터베이스 모델

### User
사용자 정보 관리

### Transaction
수입/지출 거래 내역

### Category
거래 카테고리 (수입/지출 구분)

### Budget
월별 예산 설정

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
# .env 파일에서 DATABASE_URL 및 기타 환경 변수 설정

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

# Prisma Studio 실행 (데이터베이스 GUI)
yarn prisma studio
```

## 프로젝트 구조

```
moneger/
├── app/              # Next.js App Router 페이지
├── lib/              # 유틸리티 함수 및 설정
│   └── prisma.ts    # Prisma Client 인스턴스
├── prisma/           # Prisma 스키마 및 마이그레이션
│   └── schema.prisma
├── public/           # 정적 파일
└── prisma.config.ts  # Prisma 설정
```

## 환경 변수

`.env` 파일에 다음 환경 변수를 설정하세요:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/moneger?schema=public"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```
