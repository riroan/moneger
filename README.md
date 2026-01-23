<p align="center">
  <img src="public/banner.svg" alt="Moneger Banner" width="100%" />
</p>

---

## 왜 Moneger인가요?

돈 관리가 어렵게 느껴지시나요? Moneger는 복잡한 재정 관리를 **간단하고 직관적인 경험**으로 바꿔드립니다.

- **한눈에 보는 재정 현황**: 대시보드에서 이번 달 수입, 지출, 저축을 즉시 확인
- **목표 달성 도우미**: 저축 목표를 설정하고 진행 상황을 추적
- **언제 어디서나**: 데스크톱과 모바일에서 동일한 경험 제공

---

## 주요 기능

### 대시보드

오늘의 거래 요약부터 월별 통계까지, 필요한 정보를 한 화면에서 확인하세요.

- 오늘/이번 달 수입·지출 요약
- 카테고리별 지출 차트
- 최근 거래 내역 미리보기

### 거래 관리

수입과 지출을 빠르게 기록하고 체계적으로 관리하세요.

- 간편한 거래 추가 (수입/지출/저축)
- 날짜, 카테고리, 금액, 메모 기록
- 무한 스크롤로 모든 내역 조회
- 강력한 필터링 (기간, 금액, 카테고리, 검색어)

### 저축 목표

목표를 세우고 꾸준히 저축하는 습관을 만들어보세요.

- 저축 목표 금액 설정
- 이번 달 저축 진행률 확인
- 저축 거래 내역 관리

### 맞춤 카테고리

나만의 분류 체계로 지출을 관리하세요.

- 12가지 색상으로 카테고리 구분
- 아이콘으로 한눈에 파악
- 수입/지출 카테고리 분리

### 예산 관리

월별 예산을 설정하고 지출을 조절하세요.

- 월 예산 금액 설정
- 예산 대비 지출 현황 확인

---

## 시작하기

### 요구사항

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

# 데이터베이스 설정
yarn prisma migrate dev
yarn prisma generate
```

### 실행

```bash
# 개발 서버 실행
yarn dev

# 프로덕션 빌드 및 실행
yarn build
yarn start
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

---

## 환경 변수

`.env` 파일에 다음 환경 변수를 설정하세요:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/moneger?schema=public"
```

---

## 테스트

```bash
# 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage
```

---

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| State | Zustand |
| Database | PostgreSQL, Prisma 7 |
| Charts | Recharts |

---

<p align="center">
  <sub>Made with ❤️ for better financial management</sub>
</p>
